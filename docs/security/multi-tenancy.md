# FusionOS Multi-Tenancy & Authorization Security

> Phase 4: Multi-Tenancy & Authorization Enforcement
> Status: IMPLEMENTED

## Security Hierarchy

```
Super Admin (platform-level, system role)
    ↓
Tenant (isolated business entity)
    ↓
Company / Organization
    ↓
Branch
    ↓
Department
    ↓
Team
    ↓
User / Employee
    ↓
Resource
```

## Tenancy Architecture

### Tenant Model

- **Shared PostgreSQL schema** with mandatory `tenantId` column on all tenant-sensitive tables
- **Server-side enforcement** via TenantContextService and RBACGuard
- **PostgreSQL RLS** available as defense-in-depth (optional, documented below)
- **Frontend filtering is cosmetic only** — never a security boundary

### Tenant Context

The `TenantContextService` derives tenant context from authenticated identity:

1. User authenticates → JWT contains `userId` + `email`
2. JWT strategy loads user from database (verifies active status)
3. `RBACGuard` calls `TenantContextService.resolve(userId, tenantId)`
4. Service loads user's `UserRole` memberships from database
5. Resolves the active tenant, role, and permissions
6. Stores `TenantContext` on the request for downstream use

**NEVER trust client-provided:**
- `tenantId`
- `companyId`
- `role`
- `permissions`
- `userId`

for authorization purposes.

### Tenant Membership

Users are linked to tenants via the `UserRole` model:

```
User → UserRole (userId, roleId, tenantId, scope)
         ↓
       Role → RolePermission → Permission
```

- A user can belong to **multiple tenants** (multi-tenant membership)
- Each membership has a **role** with specific **permissions**
- Optional **scope** field allows dimension-based access (branch, department, team)

## RBAC (Role-Based Access Control)

### System Roles

| Role | Tenant-Scoped | Description |
|------|--------------|-------------|
| `super_admin` | No (system) | Platform administrator — full access across all tenants |
| `company_owner` | Yes | Company owner — full access within their tenant |
| `hr_manager` | Yes | Manages employees, attendance, leave, payroll |
| `finance_manager` | Yes | Manages accounts, invoices, payments |
| `crm_manager` | Yes | Manages clients, leads, opportunities |
| `team_manager` | Yes | Manages team members and tasks |
| `employee` | Yes | Basic self-service access |

### Permissions

Permissions follow the format `resource:action`:

- `employee:read`, `employee:create`, `employee:update`, `employee:delete`
- `attendance:read`, `attendance:manage`
- `leave:read`, `leave:approve`
- `payroll:read`, `payroll:manage`, `payroll:approve`
- `finance:read`, `finance:manage`
- `crm:read`, `crm:manage`
- `settings:read`, `settings:manage`
- `user:manage`, `role:manage`

### Authorization Flow

```
Request → JwtAuthGuard (authentication)
       → RBACGuard (reads decorator metadata)
       → TenantContextService.resolve() (loads memberships from DB)
       → Check permissions/roles against metadata
       → Store TenantContext on request
       → Controller uses @CurrentTenant() for tenant-scoped queries
```

### Decorators

```typescript
// Require a single permission
@RequirePermission('employee:read')

// Require ALL of listed permissions
@RequireAllPermissions('employee:read', 'employee:update')

// Require ANY of listed permissions
@RequireAnyPermission('payroll:read', 'payroll:manage')

// Require a specific role
@RequireRole('hr_manager')

// Require Super Admin
@RequireSuperAdmin()

// Mark as tenant-scoped (optional, for documentation)
@RequireTenantScoped()
```

## Resource Authorization

Every controller method that accesses tenant-owned resources must:

1. Use `@CurrentTenant()` to get the resolved `TenantContext`
2. Query with `tenantId` filter from the context
3. For individual resources, validate ownership via `TenantContextService.validateResourceOwnership()`

```typescript
@Get('employees/:id')
async getEmployee(
  @CurrentTenant() ctx: TenantContext,
  @Param('id') id: string,
) {
  const employee = await this.employeeService.findOne(id);
  // Object-level authorization
  this.tenantContextService.validateResourceOwnership(
    ctx.tenantId,
    employee.tenantId,
    'employee',
  );
  return employee;
}
```

## Tenant-Safe Database Access

### Principles

1. **Every query on tenant-owned tables MUST include `tenantId` filter**
2. **Unique constraints are tenant-scoped** (e.g., `@@unique([tenantId, email])`)
3. **Foreign keys reference tenant-owned parents** (cascading tenant isolation)
4. **No child record can reference another tenant's parent**

### Index Strategy

- Every tenant-scoped table has `@@index([tenantId])`
- Composite indexes for common patterns: `@@index([tenantId, status])`
- Unique constraints include tenantId: `@@unique([tenantId, employeeCode])`

## PostgreSQL Row Level Security (RLS)

**Status: NOT IMPLEMENTED**

RLS is evaluated as defense-in-depth but not implemented in Phase 4 because:

1. The application-level authorization via RBACGuard provides strong isolation
2. RLS requires PostgreSQL-specific SQL migrations that add complexity
3. The team prefers to implement RLS after the employee module is stable (Phase 6)
4. RLS policies must be tested against a real PostgreSQL instance

**Future implementation plan:**
- Add RLS policies via Prisma migration SQL
- Test against real PostgreSQL
- Document as additional defense layer
- Application authorization remains mandatory regardless of RLS

## IDOR Protection

Insecure Direct Object Reference (IDOR) is prevented by:

1. **TenantContext validation** — every resource access validates tenant ownership
2. **Tenant-scoped queries** — all queries include `tenantId` filter
3. **Object-level authorization** — `validateResourceOwnership()` checks before returning data
4. **Security tests** — automated tests verify cross-tenant access is denied

## Privilege Escalation Protection

Prevented by:

1. **Server-side role resolution** — roles come from database, not client
2. **RBACGuard** — enforces permissions before controller executes
3. **System role protection** — system roles cannot be modified
4. **UserRole creation** — requires authorization (not exposed in public API)
5. **Security tests** — automated tests verify escalation attempts fail

## Error Responses

| Scenario | HTTP Status | Behavior |
|----------|------------|----------|
| Unauthenticated | 401 | No tenant context |
| Authenticated, no tenant access | 403 | "User has no tenant memberships" |
| Wrong tenant | 403 | "Access denied: resource belongs to another tenant" |
| Missing permission | 403 | "Access denied: missing required permission(s)" |
| Wrong role | 403 | "Access denied: requires one of roles [...]" |

**Never leak:**
- Existence of another tenant's resources
- Internal authorization rules
- Sensitive database information

## Audit & Security Events

The `SecurityAuditService` records:

- `permission_denied` — when authorization fails
- `cross_tenant_access_attempt` — when cross-tenant access is attempted
- `privilege_escalation_attempt` — when privilege escalation is attempted
- `idor_attempt` — when IDOR is attempted
- `role_changed` — when user roles are modified
- `tenant_membership_changed` — when tenant membership changes

Events are appended to the `AuthEvent` table with `security:` prefix.
Events are never updated or deleted.

## Security Test Suite

### Cross-Tenant Isolation Tests
- Tenant A user DENIED access to Tenant B
- Tenant B user DENIED access to Tenant A
- Resource ownership validation
- Database query isolation

### RBAC Tests
- All required roles exist
- Permissions are correctly assigned to roles
- Employee cannot perform HR Manager actions
- HR Manager cannot perform Finance Manager actions
- Permission check logic (all/any matching)

### IDOR Tests
- Cross-tenant company access by ID
- Cross-tenant user role access

### Privilege Escalation Tests
- User cannot change own role
- User cannot assign themselves to another tenant
- User cannot modify tenant ownership

### Role Manipulation Tests
- Cannot create roles in another tenant
- System roles cannot be modified

## AI Security Boundary (Future)

When AI is implemented (Phase 15):

```
AI request → authenticated user → tenant context → authorization
          → allowed tools → tenant-scoped data → AI response
```

AI must never bypass tenant authorization.

## Automation Security Boundary (Future)

When automation is implemented (Phase 18):

```
Automation execution → tenant context → workflow identity
                    → permission context → tool authorization
```

An automation from Tenant A must never execute against Tenant B.

## Testing Strategy

### Unit Tests
- TenantContextService resolution
- Permission check logic
- Resource ownership validation

### Integration Tests
- Cross-tenant database isolation
- RBAC guard enforcement
- Audit event recording

### Security Tests (Negative Tests)
- Cross-tenant reads, updates, deletes
- IDOR attempts
- Privilege escalation attempts
- Role manipulation attempts
- Tenant manipulation attempts

**The most important tests are negative tests.**
