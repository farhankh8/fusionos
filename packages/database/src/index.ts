/**
 * FusionOS database package.
 *
 * Re-exports the Prisma client and database utilities.
 * All database access should go through this package.
 */

export { PrismaClient } from '@prisma/client';
export type { Tenant, User } from '@prisma/client';
