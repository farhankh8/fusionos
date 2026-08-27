/**
 * FusionOS shared type definitions.
 *
 * These are base types used across multiple packages and applications.
 * Domain-specific types should live in the types package.
 */

// ── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
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

// ── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Domain Identity ──────────────────────────────────────────────────────────

/** Base entity with common audit fields. */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Tenant-scoped entity. */
export interface TenantEntity extends BaseEntity {
  tenantId: string;
}

/** Soft-deletable entity. */
export interface SoftDeletableEntity extends TenantEntity {
  deletedAt: Date | null;
}

// ── Financial ────────────────────────────────────────────────────────────────

/** Amount stored as integer minor units (e.g., cents). Never use floats for money. */
export interface MoneyAmount {
  amount: number; // minor units (e.g., 1500 = $15.00)
  currency: string; // ISO 4217 currency code
}

// ── Event Contracts ──────────────────────────────────────────────────────────

/** Base domain event structure. */
export interface DomainEvent {
  eventId: string;
  eventType: string;
  tenantId: string;
  occurredAt: Date;
  correlationId?: string;
  payload: Record<string, unknown>;
}

// ── Request Context ──────────────────────────────────────────────────────────

/** Server-side request context for authorization and audit. */
export interface RequestContext {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}
