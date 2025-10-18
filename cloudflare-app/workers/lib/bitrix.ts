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
   * Convert ArrayBuffer to base64 string safely (without stack overflow)
   * Processes data in chunks to avoid call stack size exceeded errors
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192; // Process 8KB at a time
    let binary = '';

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    return btoa(binary);
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
      // Try to cache in KV (non-critical, fail gracefully)
      try {
        await this.env.CACHE.put(cacheKey, JSON.stringify(employee), {
          expirationTtl: 86400
        });
      } catch (error) {
        console.warn('KV cache write failed (quota exceeded?):', error);
      }

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
      // Try to cache in KV (non-critical, fail gracefully)
      try {
        await this.env.CACHE.put(cacheKey, JSON.stringify(employee), {
          expirationTtl: 86400
        });
      } catch (error) {
        console.warn('KV cache write failed (quota exceeded?):', error);
      }

      // Update D1 cache
      await this.updateEmployeeCache(employee);
    }

    return employee || null;
  }

  /**
   * Get employee directly from Bitrix24 (bypass all caches)
   * Use this for verifying updates have propagated
   */
  private async getEmployeeUncached(id: number): Promise<BitrixEmployee | null> {
    const response = await this.request<BitrixItemResult>('crm.item.get', {
      entityTypeId: this.entityTypeId,
      id: id.toString()
    });

    return (response.result?.item as BitrixEmployee | undefined) || null;
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

      // Update cache for each employee IN PARALLEL for speed
      await Promise.all(items.map(async (employee) => {
        // Update D1 cache
        await this.updateEmployeeCache(employee);

        // Try to update KV cache (non-critical, fail gracefully)
        try {
          const cacheKeyId = `employee:id:${employee.id}`;
          const cacheKeyBadge = `employee:badge:${employee.ufCrm6BadgeNumber}`;

          await Promise.all([
            this.env.CACHE.put(cacheKeyId, JSON.stringify(employee), {
              expirationTtl: 86400
            }),
            employee.ufCrm6BadgeNumber
              ? this.env.CACHE.put(cacheKeyBadge, JSON.stringify(employee), {
                  expirationTtl: 86400
                })
              : Promise.resolve()
          ]);
        } catch (error) {
          console.warn(`KV cache write failed for employee ${employee.id} (quota exceeded?):`, error);
        }
      }));

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
    // Format fields as individual parameters: fields[fieldName]=value
    const createParams: Record<string, any> = {
      entityTypeId: this.entityTypeId
    };

    // Add each field as a separate parameter
    for (const [key, value] of Object.entries(fields)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          createParams[`fields[${key}][${index}]`] = String(item);
        });
      } else if (value !== null && value !== undefined) {
        createParams[`fields[${key}]`] = String(value);
      }
    }

    const response = await this.request<BitrixItemResult>('crm.item.add', createParams);

    return response.result?.item || null;
  }

  /**
   * Update employee fields in Bitrix24 with eventual consistency handling
   */
  async updateEmployee(id: number, fields: Partial<BitrixEmployee>): Promise<BitrixEmployee | null> {
    // Step 1: Update in Bitrix24
    // IMPORTANT: Bitrix24 expects fields as individual form parameters, NOT as a JSON string
    // Each field should be sent as fields[fieldName]=value
    const updateParams: Record<string, any> = {
      entityTypeId: this.entityTypeId,
      id: id.toString()
    };

    // Add each field as a separate parameter: fields[fieldName]=value
    for (const [key, value] of Object.entries(fields)) {
      if (Array.isArray(value)) {
        // For arrays, send each element as fields[fieldName][index]=value
        value.forEach((item, index) => {
          updateParams[`fields[${key}][${index}]`] = String(item);
        });
      } else if (value !== null && value !== undefined) {
        updateParams[`fields[${key}]`] = String(value);
      }
    }

    const response = await this.request<BitrixItemResult>('crm.item.update', updateParams);

    const updatedEmployee = response.result?.item as BitrixEmployee | undefined;
    if (!updatedEmployee) {
      return null;
    }

    // Step 2: Wait for Bitrix eventual consistency (500ms delay)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 3: Fetch fresh data from Bitrix with retry logic
    let freshEmployee = updatedEmployee;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const refetchResponse = await this.request<BitrixItemResult>('crm.item.get', {
          entityTypeId: this.entityTypeId,
          id: id.toString()
        });

        const refetched = refetchResponse.result?.item as BitrixEmployee | undefined;
        if (refetched) {
          freshEmployee = refetched;
          break; // Successfully refetched
        }
      } catch (err) {
        console.error(`Refetch attempt ${attempt + 1} failed:`, err);
        if (attempt < 2) {
          // Wait 300ms before retry
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }

    // Step 4: Invalidate KV caches and update D1 cache
    // Delete from KV to force fresh fetch on next request
    try {
      const cacheKeyId = `employee:id:${id}`;
      const cacheKeyBadge = `employee:badge:${freshEmployee.ufCrm6BadgeNumber}`;

      await Promise.all([
        this.env.CACHE.delete(cacheKeyId).catch(e => console.warn('KV delete failed:', e)),
        freshEmployee.ufCrm6BadgeNumber
          ? this.env.CACHE.delete(cacheKeyBadge).catch(e => console.warn('KV delete failed:', e))
          : Promise.resolve()
      ]);

      console.log(`[updateEmployee] KV cache invalidated for employee ${id}`);
    } catch (cacheErr) {
      console.warn('KV cache invalidation failed (quota exceeded?):', cacheErr);
    }

    // Always update D1 cache (critical for data consistency)
    try {
      await this.updateEmployeeCache(freshEmployee);
    } catch (d1Err) {
      console.error('D1 cache update failed:', d1Err);
    }

    return freshEmployee;
  }

  /**
   * Upload file and attach to employee record (single file field - replaces existing)
   * For Bitrix24 CRM, we pass base64 data directly in the field update
   * Returns the updated employee data
   */
  async uploadFileToEmployee(
    employeeId: number,
    fileName: string,
    fileContent: ArrayBuffer,
    fieldName: string
  ): Promise<BitrixEmployee | null> {
    // Convert ArrayBuffer to base64 using safe chunked method
    const base64Content = this.arrayBufferToBase64(fileContent);

    // For Bitrix24 CRM file fields, pass an array with file data
    // Format: [fileName, base64Content]
    const updateFields: Record<string, any> = {
      [fieldName]: [fileName, base64Content]
    };

    const updatedEmployee = await this.updateEmployee(employeeId, updateFields as any);

    // File uploads need extra time for Bitrix24 propagation
    // Wait longer and verify file field has data
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify file was actually uploaded with more aggressive retries
    // Use uncached fetch to bypass KV eventual consistency
    for (let attempt = 0; attempt < 5; attempt++) {
      const freshEmployee = await this.getEmployeeUncached(employeeId);
      if (freshEmployee) {
        const fileValue = (freshEmployee as any)[fieldName];
        // Check if file field has a valid value (not 0, null, undefined, or empty string)
        if (fileValue && fileValue !== 0 && fileValue !== '') {
          console.log(`[uploadFileToEmployee] File verified on attempt ${attempt + 1}`);
          // Update cache with verified data
          await this.updateEmployeeCache(freshEmployee);
          return freshEmployee;
        }
      }

      if (attempt < 4) {
        console.log(`[uploadFileToEmployee] File not yet visible, retry ${attempt + 1}/5...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.warn('[uploadFileToEmployee] File upload succeeded but file not visible after 5 retries');
    return updatedEmployee;
  }

  /**
   * Add file to employee record (multiple file field - adds to array)
   * Returns the updated employee data
   */
  async addFileToEmployee(
    employeeId: number,
    fileName: string,
    fileContent: ArrayBuffer,
    fieldName: string
  ): Promise<BitrixEmployee | null> {
    // Step 1: Get current employee data to find existing files
    const currentEmployee = await this.getEmployee(employeeId);
    if (!currentEmployee) {
      throw new Error('Employee not found');
    }

    // Step 2: Convert ArrayBuffer to base64 using safe chunked method
    const base64Content = this.arrayBufferToBase64(fileContent);

    // Step 3: Get existing files (Bitrix24 returns file objects with id, name, etc.)
    const existingValue = (currentEmployee as any)[fieldName];
    let updatedFiles: any[];

    if (Array.isArray(existingValue) && existingValue.length > 0) {
      // Existing files - add new file to array as [fileName, base64Content]
      updatedFiles = [...existingValue, [fileName, base64Content]];
    } else {
      // No existing files - create array with just the new file
      updatedFiles = [[fileName, base64Content]];
    }

    // Step 4: Update employee record with new file array
    const updateFields: Record<string, any> = {
      [fieldName]: updatedFiles
    };

    const updatedEmployee = await this.updateEmployee(employeeId, updateFields as any);

    // File uploads need extra time for Bitrix24 propagation
    // Wait longer and verify file field has data
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify file was actually uploaded with more aggressive retries
    // Use uncached fetch to bypass KV eventual consistency
    for (let attempt = 0; attempt < 5; attempt++) {
      const freshEmployee = await this.getEmployeeUncached(employeeId);
      if (freshEmployee) {
        const fileValue = (freshEmployee as any)[fieldName];
        // Check if file field has a valid value (not 0, null, undefined, or empty string)
        if (fileValue && fileValue !== 0 && fileValue !== '') {
          console.log(`[addFileToEmployee] File verified on attempt ${attempt + 1}`);
          // Update cache with verified data
          await this.updateEmployeeCache(freshEmployee);
          return freshEmployee;
        }
      }

      if (attempt < 4) {
        console.log(`[addFileToEmployee] File not yet visible, retry ${attempt + 1}/5...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.warn('[addFileToEmployee] File upload succeeded but file not visible after 5 retries');
    return updatedEmployee;
  }

  /**
   * Remove file from employee record (works for both single and multiple file fields)
   * For single file fields: clears the field
   * For multiple file fields: removes specific file from array
   * Returns the updated employee data
   */
  async removeFileFromEmployee(
    employeeId: number,
    fieldName: string,
    fileIdToRemove?: number
  ): Promise<BitrixEmployee | null> {
    console.log(`[Bitrix removeFile] Employee: ${employeeId}, Field: ${fieldName}, FileId: ${fileIdToRemove}`);

    // Get current employee data
    const currentEmployee = await this.getEmployee(employeeId);
    if (!currentEmployee) {
      throw new Error('Employee not found');
    }

    const existingValue = (currentEmployee as any)[fieldName];
    console.log(`[Bitrix removeFile] Existing value type: ${typeof existingValue}, isArray: ${Array.isArray(existingValue)}`);
    console.log(`[Bitrix removeFile] Existing value:`, JSON.stringify(existingValue));

    let updateFields: Record<string, any>;

    if (Array.isArray(existingValue)) {
      // Multiple file field - remove specific file
      if (!fileIdToRemove) {
        // Remove all files if no specific ID provided (use empty string for Bitrix24)
        updateFields = { [fieldName]: '' };
        console.log(`[Bitrix removeFile] Removing all files (array field)`);
      } else {
        // Filter out the file by ID (handle both file objects and legacy IDs)
        const updatedFiles = existingValue.filter((file: any) => {
          // If it's a file object, check the id property
          if (typeof file === 'object' && file.id) {
            return file.id !== fileIdToRemove;
          }
          // If it's just an ID (legacy format)
          return file !== fileIdToRemove;
        });
        updateFields = { [fieldName]: updatedFiles.length > 0 ? updatedFiles : '' };
        console.log(`[Bitrix removeFile] Filtered files, remaining: ${updatedFiles.length}`);
      }
    } else {
      // Single file field - clear it (Bitrix24 requires empty string, not null)
      updateFields = { [fieldName]: '' };
      console.log(`[Bitrix removeFile] Clearing single file field`);
    }

    console.log(`[Bitrix removeFile] Update fields:`, JSON.stringify(updateFields));

    try {
      const updatedEmployee = await this.updateEmployee(employeeId, updateFields as any);
      console.log(`[Bitrix removeFile] Update successful`);
      return updatedEmployee;
    } catch (error) {
      console.error(`[Bitrix removeFile] Update failed:`, error);
      throw error;
    }
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
