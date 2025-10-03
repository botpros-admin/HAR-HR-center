/**
 * Bitrix24 API Client for Cloudflare Workers
 */

import type { Env, BitrixEmployee } from '../types';

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

    const response = await this.request('crm.item.list', {
      entityTypeId: this.entityTypeId,
      'filter[ufCrm6BadgeNumber]': badgeNumber
    });

    const employee = response.result?.items?.[0] as BitrixEmployee | undefined;

    if (employee) {
      // Cache for 1 hour
      await this.env.CACHE.put(cacheKey, JSON.stringify(employee), {
        expirationTtl: 3600
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

    const response = await this.request('crm.item.get', {
      entityTypeId: this.entityTypeId,
      id: id.toString()
    });

    const employee = response.result?.item as BitrixEmployee | undefined;

    if (employee) {
      // Cache for 1 hour
      await this.env.CACHE.put(cacheKey, JSON.stringify(employee), {
        expirationTtl: 3600
      });

      // Update D1 cache
      await this.updateEmployeeCache(employee);
    }

    return employee || null;
  }

  /**
   * Make request to Bitrix24 API
   */
  private async request(method: string, params: Record<string, any> = {}): Promise<any> {
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

    const data = await response.json();

    if (data.error) {
      throw new Error(`Bitrix24 error: ${data.error_description || data.error}`);
    }

    return data;
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
