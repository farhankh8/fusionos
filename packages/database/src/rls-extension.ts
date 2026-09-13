/**
 * FusionOS Prisma RLS Extension
 *
 * Sets the PostgreSQL session variable `app.current_tenant_id` so that
 * Row-Level Security policies scope every query to the current tenant.
 *
 * SAFETY:
 * - Context is set with SET LOCAL semantics INSIDE a Prisma $transaction.
 *   Prisma pins every statement of a transaction to a single pooled
 *   connection, and SET LOCAL is reset when the transaction ends, so the
 *   setting can never leak onto the next request on a pooled connection.
 * - A bare `set_config(..., is_local => false)` OUTSIDE a transaction (the
 *   previous implementation) persists for the whole session of that pooled
 *   connection and leaks the tenant to subsequent requests — a genuine
 *   cross-tenant data-leak vector. This file must never do that.
 * - Application-layer tenant checks remain active (defense-in-depth).
 * - Fails closed: no tenant context → RLS exposes no rows.
 *
 * Usage:
 *   await withTenantContext(prisma, tenantId, async (tx) => {
 *     return tx.employee.findMany(); // scoped by RLS to tenantId
 *   });
 */

import { PrismaClient } from '@prisma/client';

/**
 * Execute a function inside a transaction with RLS tenant context applied.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID to set for RLS policies
 * @param fn - Function to execute within the tenant context
 * @returns Result of the function
 */
export async function withTenantContext<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // SET LOCAL: transaction-scoped — reset when the transaction ends.
    // set_config(..., true) is the parameterized equivalent of SET LOCAL.
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant_id', $1, true)`,
      tenantId,
    );

    // Execute the function within tenant context
    return fn(tx as PrismaClient);
  });
}

/**
 * Clear tenant context (for super-admin operations).
 * MUST be called inside a transaction; the SET LOCAL semantics scope the
 * reset to that transaction. Use with caution — this disables RLS filtering
 * for the current transaction when run by an RLS-exempt role.
 *
 * @param prisma - PrismaClient instance (must be within a transaction)
 */
export async function clearTenantContext(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_tenant_id', '', true)`,
  );
}

/**
 * Check if RLS is enabled on a table.
 * Useful for verifying RLS status during health checks.
 *
 * @param prisma - PrismaClient instance
 * @param tableName - Table to check
 * @returns Whether RLS is enabled
 */
export async function isRLSEnabled(
  prisma: PrismaClient,
  tableName: string,
): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ relrowsecurity: boolean }>>`
    SELECT relrowsecurity
    FROM pg_class
    WHERE relname = ${tableName}
  `;
  return result[0]?.relrowsecurity ?? false;
}

/**
 * Check whether the CURRENT CONNECTION is subject to RLS at all.
 * Superusers and table owners are exempt from RLS regardless of policies —
 * running "RLS verification" as such a role is meaningless. This helper lets
 * tests and health checks assert they are NOT in that exempt state.
 *
 * @param prisma - PrismaClient instance
 * @returns true if the current user is a superuser (RLS exempt)
 */
export async function isSuperuser(prisma: PrismaClient): Promise<boolean> {
  const result = await prisma.$queryRaw<Array<{ rolsuper: boolean }>>`
    SELECT rolsuper FROM pg_roles WHERE rolname = current_user
  `;
  return result[0]?.rolsuper ?? false;
}
