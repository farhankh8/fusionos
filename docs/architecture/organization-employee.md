# FusionOS Organization & Employee Architecture

## Phase 5 — Organization & Employee Management

### Overview

The Organization & Employee domain is the **canonical source** of all organizational and employee information in FusionOS. Every future module (Attendance, Leave, Payroll, Projects, Assets, CRM) references this entity rather than duplicating employee data.

### Organization Hierarchy

```
Tenant
 └── Company
      ├── Branch
      │    └── Department
      │         └── Team
      │              └── Employee
      │
      └── Other Companies (holding structures)
```

**Key Principles:**
- Every entity is **tenant-scoped** — cross-tenant access is forbidden
- Not every level is required — flexible organization structures are supported
- Company → Branch → Department → Team → Employee is the canonical path
- Designations are scoped to a Company

### Entities

#### Company
- Primary organizational unit within a tenant
- A tenant may have multiple companies (for holding structures)
- Fields: name, legalName, code (unique per tenant), status, address, timezone, currency
- Relations: branches, departments, teams, employees

#### Branch
- Physical location or office of a company
- Fields: name, code (unique per company), status, address, timezone, phone, email
- Relations: company, departments, employees

#### Department
- Functional unit within a company
- Supports hierarchical departments (parent-child)
- Fields: name, code (unique per company), status, branch (optional), parent (optional), head (employee reference)
- Relations: company, branch, parent, children, teams, employees

#### Team
- Small group within a department
- Fields: name, code (unique per department), status, manager (employee reference)
- Relations: company, department, employees

#### Designation
- Job title / position within the organization
- Scoped to a company
- Fields: name, code (unique per company), description, level, isActive
- Relations: employees

### Employee — The Canonical Entity

The Employee is the **central master entity** of FusionOS. Every people-domain module references this entity.

#### Employee Fields

**Identity:**
- employeeCode (tenant-scoped unique identifier — NEVER use database UUID as employee number)
- firstName, middleName, lastName, preferredName
- email (tenant-scoped unique), phone
- dateOfBirth, gender, maritalStatus, nationality
- address (structured JSON)

**Employment:**
- companyId, branchId, departmentId, teamId, designationId
- managerId (self-referential — reports-to relationship)
- employmentStatus (lifecycle state)
- employmentType (FULL_TIME, PART_TIME, CONTRACT, INTERN, TEMPORARY)
- workLocation, timezone
- joiningDate, probationEndDate, confirmationDate, terminationDate

**Compensation:**
- currency (ISO 4217), basicSalary (integer minor units)

**Emergency Contact:**
- emergencyContactName, emergencyContactPhone, emergencyContactRelation

**User Linkage:**
- userId (nullable — not every employee needs a login account)
- Supports both: Employee without User, and Employee linked to User

### Employee Lifecycle

```
DRAFT → ACTIVE → ON_LEAVE → ACTIVE
              → SUSPENDED → ACTIVE
              → TERMINATED → ACTIVE (rehire only)
              → RESIGNED → ACTIVE (rehire only)
              → RETIRED → ACTIVE (rehire only)
              → INACTIVE → ACTIVE (reactivation)
```

**Status Transitions:**
| From | Allowed To |
|------|-----------|
| DRAFT | ACTIVE, INACTIVE |
| ACTIVE | PROBATION, ON_LEAVE, SUSPENDED, TERMINATED, RESIGNED, RETIRED, INACTIVE |
| PROBATION | ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED, RESIGNED, INACTIVE |
| ON_LEAVE | ACTIVE, PROBATION, SUSPENDED, TERMINATED, RESIGNED, INACTIVE |
| SUSPENDED | ACTIVE, PROBATION, ON_LEAVE, TERMINATED, RESIGNED, INACTIVE |
| TERMINATED | ACTIVE (rehire only) |
| RESIGNED | ACTIVE (rehire only) |
| RETIRED | ACTIVE (rehire only) |
| INACTIVE | ACTIVE, DRAFT |

### Employee History

Every meaningful employment change is recorded in `EmployeeHistory` (append-only):

- Hired, promoted, transferred, terminated
- Department change, branch transfer, team change
- Designation change, manager change
- Status change, employment type change

Each history record captures:
- Employee, Tenant, Action type
- Previous and new values (JSON snapshots)
- Effective date, Actor (userId), Timestamp
- Reason and notes

### Manager Relationship

- Self-referential: Employee → Employee (managerId)
- Validation: same tenant, valid employee, no self-management
- Circular hierarchy detection deferred to future enhancement

### Permissions

| Resource | Permissions |
|----------|------------|
| company | read, create, update |
| branch | read, create, update |
| department | read, create, update |
| team | read, create, update |
| designation | read, create, update |
| employee | read, create, update, manage |

### Tenant Security

Every operation enforces:
1. **Authentication** — JWT validates the user
2. **Tenant Context** — resolves the user's tenant membership
3. **RBAC** — checks required permissions
4. **Object-Level** — validates resource belongs to the tenant

Cross-tenant access is blocked at every layer:
- Database queries are always filtered by tenantId
- Service methods validate tenant ownership
- Controller endpoints require tenant context

### Future Module Relationships

Every future module references the canonical Employee:

```
Employee
  ├── Attendance (Phase 7)
  ├── Leave (Phase 8)
  ├── Payroll (Phase 9)
  ├── Projects (Phase 12)
  ├── Assets (Phase 13)
  └── Documents (future)
```

Modules never create separate employee records. They reference `employeeId` from this canonical entity.

### API Endpoints

```
POST   /api/v1/organization/companies
GET    /api/v1/organization/companies
GET    /api/v1/organization/companies/:id
PATCH  /api/v1/organization/companies/:id

POST   /api/v1/organization/branches
GET    /api/v1/organization/branches
GET    /api/v1/organization/branches/:id
PATCH  /api/v1/organization/branches/:id

POST   /api/v1/organization/departments
GET    /api/v1/organization/departments
GET    /api/v1/organization/departments/:id
PATCH  /api/v1/organization/departments/:id

POST   /api/v1/organization/teams
GET    /api/v1/organization/teams
GET    /api/v1/organization/teams/:id
PATCH  /api/v1/organization/teams/:id

POST   /api/v1/organization/designations
GET    /api/v1/organization/designations
GET    /api/v1/organization/designations/:id
PATCH  /api/v1/organization/designations/:id

POST   /api/v1/employees
GET    /api/v1/employees
GET    /api/v1/employees/:id
PATCH  /api/v1/employees/:id
PATCH  /api/v1/employees/:id/status
GET    /api/v1/employees/:id/history
DELETE /api/v1/employees/:id (soft delete)
```
