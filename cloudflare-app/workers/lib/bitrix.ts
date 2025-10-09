/**
 * Bitrix24 API Client for Cloudflare Workers
 */

import type { Env, BitrixEmployee } from '../types';

type BitrixApiResponse<T> = {
  result?: T;
  error?: string;
  error_description?: string;
};

type BitrixListResult = {
  items?: BitrixEmployee[];
};

type BitrixItemResult = {
  item?: BitrixEmployee;
};

export class BitrixClient {
  private baseUrl: string;
  private entityTypeId: string;

  constructor(private env: Env) {
    this.baseUrl = env.BITRIX24_WEBHOOK_URL;
    this.entityTypeId = env.BITRIX24_ENTITY_TYPE_ID;
  }

  /**
   * Get employee by badge number
   */
  async getEmployeeByBadgeNumber(badgeNumber: string): Promise<BitrixEmployee | null> {
    // Check cache first (KV)
    const cacheKey = `employee:badge:${badgeNumber}`;
    const cached = await this.env.CACHE.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const response = await this.request<BitrixListResult>('crm.item.list', {
      entityTypeId: this.entityTypeId,
      'filter[ufCrm6BadgeNumber]': badgeNumber
    });

    const employee = response.result?.items?.[0] as BitrixEmployee | undefined;

    if (employee) {
      // Cache for 24 hours (86400 seconds)
      await this.env.CACHE.put(cacheKey, JSON.stringify(employee), {
        expirationTtl: 86400
      });

      // Update D1 cache
      await this.updateEmployeeCache(employee);
    }

    return employee || null;
  }

  /**
   * Get employee by Bitrix ID
   */
  async getEmployee(id: number): Promise<BitrixEmployee | null> {
    // Check cache first
    const cacheKey = `employee:id:${id}`;
    const cached = await this.env.CACHE.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const response = await this.request<BitrixItemResult>('crm.item.get', {
      entityTypeId: this.entityTypeId,
      id: id.toString()
    });

    const employee = response.result?.item as BitrixEmployee | undefined;

    if (employee) {
      // Cache for 24 hours (86400 seconds)
      await this.env.CACHE.put(cacheKey, JSON.stringify(employee), {
        expirationTtl: 86400
      });

      // Update D1 cache
      await this.updateEmployeeCache(employee);
    }

    return employee || null;
  }

  /**
   * List all employees from Bitrix24 with pagination
   */
  async listEmployees(): Promise<BitrixEmployee[]> {
    const allEmployees: BitrixEmployee[] = [];
    let start = 0;

    while (true) {
      const params: Record<string, string> = {
        entityTypeId: this.entityTypeId
      };

      if (start > 0) {
        params['start'] = start.toString();
      }

      const response = await this.request<BitrixListResult & { next?: number; total?: number }>(
        'crm.item.list',
        params
      );

      const items = response.result?.items || [];

      if (items.length === 0) {
        break; // No more items
      }

      allEmployees.push(...items);

      // Update cache for each employee
      for (const employee of items) {
        await this.updateEmployeeCache(employee);

        // Also update KV cache (24 hours / 86400 seconds)
        const cacheKeyId = `employee:id:${employee.id}`;
        const cacheKeyBadge = `employee:badge:${employee.ufCrm6BadgeNumber}`;

        await this.env.CACHE.put(cacheKeyId, JSON.stringify(employee), {
          expirationTtl: 86400
        });

        if (employee.ufCrm6BadgeNumber) {
          await this.env.CACHE.put(cacheKeyBadge, JSON.stringify(employee), {
            expirationTtl: 86400
          });
        }
      }

      // Check if there are more items using the 'next' field from Bitrix24
      const next = (response.result as any)?.next;
      if (next !== undefined && next > start) {
        start = next;
      } else if (items.length >= 50) {
        // Fallback: if we got a full page (50 items), try the next page
        start += 50;
      } else {
        break;
      }
    }

    return allEmployees;
  }

  /**
   * Make request to Bitrix24 API
   */
  private async request<T = unknown>(method: string, params: Record<string, any> = {}): Promise<BitrixApiResponse<T>> {
    const url = `${this.baseUrl}/${method}`;
    const body = new URLSearchParams(params as Record<string, string>);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    if (!response.ok) {
      throw new Error(`Bitrix24 API error: ${response.statusText}`);
    }

    const data = (await response.json()) as BitrixApiResponse<T>;

    if (data.error) {
      throw new Error(`Bitrix24 error: ${data.error_description || data.error}`);
    }

    return data;
  }

  /**
   * Create a new item (applicant, employee, etc.)
   */
  async createItem(fields: Record<string, any>): Promise<any> {
    const response = await this.request<BitrixItemResult>('crm.item.add', {
      entityTypeId: this.entityTypeId,
      fields: JSON.stringify(fields)
    });

    return response.result?.item || null;
  }

  /**
   * Update employee fields in Bitrix24
   */
  async updateEmployee(id: number, fields: Partial<BitrixEmployee>): Promise<BitrixEmployee | null> {
    const response = await this.request<BitrixItemResult>('crm.item.update', {
      entityTypeId: this.entityTypeId,
      id: id.toString(),
      fields: JSON.stringify(fields)
    });

    const updatedEmployee = response.result?.item as BitrixEmployee | undefined;

    if (updatedEmployee) {
      // Invalidate caches
      await this.env.CACHE.delete(`employee:id:${id}`);
      if (updatedEmployee.ufCrm6BadgeNumber) {
        await this.env.CACHE.delete(`employee:badge:${updatedEmployee.ufCrm6BadgeNumber}`);
      }

      // Update D1 cache with new data
      await this.updateEmployeeCache(updatedEmployee);
    }

    return updatedEmployee || null;
  }

  /**
   * Upload file and attach to employee record
   * Returns the Bitrix24 file ID
   */
  async uploadFileToEmployee(
    employeeId: number,
    fileName: string,
    fileContent: ArrayBuffer,
    fieldName: string = 'ufCrm6Documents'
  ): Promise<string> {
    // Step 1: Upload file to Bitrix24
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(fileContent)));

    const uploadResponse = await this.request<{ FILE_ID: string }>('crm.file.upload', {
      fileName,
      fileData: base64Content
    });

    const fileId = uploadResponse.result?.FILE_ID;
    if (!fileId) {
      throw new Error('Failed to upload file to Bitrix24');
    }

    // Step 2: Attach file to employee record
    await this.request('crm.item.update', {
      entityTypeId: this.entityTypeId,
      id: employeeId.toString(),
      fields: JSON.stringify({
        [fieldName]: [fileId]
      })
    });

    return fileId;
  }

  /**
   * Add timeline entry to employee record
   */
  async addTimelineEntry(
    employeeId: number,
    comment: string,
    type: 'note' | 'activity' = 'note'
  ): Promise<void> {
    await this.request('crm.timeline.comment.add', {
      fields: JSON.stringify({
        entityId: employeeId,
        entityTypeId: this.entityTypeId,
        comment,
        type
      })
    });
  }

  /**
   * Get all field definitions for the HR Center SPA
   */
  async getFieldDefinitions(): Promise<any> {
    const response = await this.request('crm.type.fields', {
      entityTypeId: this.entityTypeId
    });

    return response.result || {};
  }

  /**
   * Update employee cache in D1
   */
  private async updateEmployeeCache(employee: BitrixEmployee): Promise<void> {
    const fullName = `${employee.ufCrm6Name} ${employee.ufCrm6LastName}`;

    await this.env.DB.prepare(`
      INSERT OR REPLACE INTO employee_cache (
        bitrix_id, badge_number, full_name, position, department,
        email, phone, data, last_sync
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
      .bind(
        employee.id,
        employee.ufCrm6BadgeNumber,
        fullName,
        employee.ufCrm6WorkPosition || null,
        employee.ufCrm6Subsidiary || null,
        employee.ufCrm6Email?.[0] || null,
        employee.ufCrm6PersonalMobile?.[0] || null,
        JSON.stringify(employee)
      )
      .run();
  }
}
