/**
 * FusionOS shared utility functions.
 *
 * These are pure, side-effect-free utilities used across packages.
 * No database, API, or framework dependencies allowed here.
 */

/**
 * Generate a unique correlation ID for request tracing.
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Safely parse JSON with a fallback value.
 */
export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Create a standardized API error response structure.
 */
export function createErrorResponse(params: {
  code: string;
  message: string;
  status: number;
  requestId?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}) {
  return {
    success: false as const,
    error: {
      code: params.code,
      message: params.message,
      status: params.status,
      requestId: params.requestId,
      details: params.details,
      timestamp: params.timestamp ?? new Date().toISOString(),
    },
  };
}

/**
 * Create a standardized API success response structure.
 */
export function createSuccessResponse<T>(data: T, meta?: Record<string, unknown>) {
  return {
    success: true as const,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Convert an amount in major units (e.g., dollars) to minor units (e.g., cents).
 * Always use this for financial amounts — never use floating-point.
 */
export function toMinorUnits(amount: number, decimals: number = 2): number {
  return Math.round(amount * Math.pow(10, decimals));
}

/**
 * Convert an amount in minor units (e.g., cents) to major units (e.g., dollars).
 */
export function toMajorUnits(minorAmount: number, decimals: number = 2): number {
  return minorAmount / Math.pow(10, decimals);
}

/**
 * Truncate a string to a maximum length, appending ellipsis if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to kebab-case.
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert a string to snake_case.
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}
