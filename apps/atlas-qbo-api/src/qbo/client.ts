import type { AppConfig } from '../config.ts';

export interface QboQueryResult {
  QueryResponse?: Record<string, unknown>;
  time?: string;
}

export interface QboCompanyInfo {
  CompanyName: string;
  Country?: string;
  FiscalYearStartMonth?: string;
}

/**
 * Thin QuickBooks Online REST client.
 * Tokens are passed in — never logged.
 */
export class QboApiClient {
  constructor(
    private cfg: AppConfig,
    private realmId: string,
    private accessToken: string,
  ) {}

  private url(path: string, query?: Record<string, string>): string {
    const u = new URL(`${this.cfg.apiBaseUrl}/v3/company/${this.realmId}${path}`);
    u.searchParams.set('minorversion', '75');
    if (query) {
      for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
    }
    return u.toString();
  }

  private async request<T>(path: string, init?: RequestInit & { query?: Record<string, string> }): Promise<T> {
    const { query, ...rest } = init || {};
    const res = await fetch(this.url(path, query), {
      ...rest,
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        accept: 'application/json',
        'content-type': 'application/json',
        ...(rest.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`qbo_api_${res.status}:${text.slice(0, 200)}`);
      (err as Error & { status: number }).status = res.status;
      throw err;
    }
    return (await res.json()) as T;
  }

  async getCompanyInfo(): Promise<QboCompanyInfo> {
    const data = await this.request<{ CompanyInfo: QboCompanyInfo }>(`/companyinfo/${this.realmId}`);
    return data.CompanyInfo;
  }

  async query(sql: string): Promise<QboQueryResult> {
    return this.request<QboQueryResult>('/query', { query: { query: sql } });
  }

  async cdc(entities: string[], changedSince: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/cdc', {
      query: {
        entities: entities.join(','),
        changedSince,
      },
    });
  }

  async report(reportName: string, params?: Record<string, string>): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`/reports/${reportName}`, { query: params });
  }
}
