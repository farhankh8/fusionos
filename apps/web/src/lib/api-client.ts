/**
 * FusionOS API Client
 *
 * Reusable API client for communicating with the NestJS backend.
 * All frontend API calls should go through this client.
 * Never scatter raw fetch calls throughout components.
 */

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3001';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  timestamp: string;
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    status: number;
    requestId?: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`/api/v1${path}`, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(path, params);

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        success: false as const,
        error: {
          code: 'NETWORK_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          timestamp: new Date().toISOString(),
        },
      }));
      throw new ApiRequestError(error.error.message, error.error.status, error.error.code);
    }

    const result: ApiResponse<T> = await response.json();
    return result.data;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(path, { method: 'GET', params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** Singleton API client instance. */
export const apiClient = new ApiClient();
