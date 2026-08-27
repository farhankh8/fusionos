/**
 * CurrentTenant decorator — extracts the resolved TenantContext from the request.
 *
 * The TenantContext is resolved server-side by RBACGuard and stored on the request.
 * NEVER trust client-provided tenant data.
 *
 * Usage in controllers:
 *   @Get('employees')
 *   async getEmployees(@CurrentTenant() ctx: TenantContext) {
 *     return this.employeeService.findAll(ctx.tenantId);
 *   }
 *
 *   @Get('employees/:id')
 *   async getEmployee(
 *     @CurrentTenant() ctx: TenantContext,
 *     @Param('id') id: string,
 *   ) {
 *     return this.employeeService.findOne(ctx.tenantId, id);
 *   }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantContext } from '../../auth/services/tenant-context.service';

export const CurrentTenant = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext = request.tenantContext as TenantContext | undefined;

    if (!tenantContext) {
      return null;
    }

    return data ? tenantContext[data] : tenantContext;
  },
);
