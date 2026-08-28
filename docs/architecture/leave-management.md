# Leave Management — Phase 7 Architecture

## Overview

Leave Management provides configurable leave types, policies, balances, requests, and holidays for FusionOS. It integrates with Attendance (Phase 6) and provides a contract for Payroll (Phase 8).

## Domain Model

```
LeaveType (Annual, Sick, Casual, etc.)
   ↓
LeavePolicy (entitlement rules)
   ↓
LeavePolicyAssignment (employee assignment)
   ↓
LeaveBalance (per employee per year per type)
   ↓
LeaveBalanceTransaction (immutable ledger)
   ↓
LeaveRequest (employee time-off requests)
   ↓
Approval/Rejection/Cancellation
   ↓
Attendance Integration (ON_LEAVE status)
```

## Leave Types

Configurable leave categories with properties:
- **isPaid**: Whether leave is paid or unpaid
- **requiresApproval**: Whether manager approval is needed
- **requiresDocument**: Whether attachment is required
- **allowHalfDay**: Whether half-day requests are allowed
- **allowHourly**: Whether hourly requests are allowed

## Leave Policies

Entitlement rules per leave type:
- **entitlementDays**: Annual entitlement
- **accrualFrequency**: Monthly/Quarterly/Yearly/One-time
- **carryForward**: Whether unused days carry forward
- **carryForwardLimit**: Maximum carry-forward days
- **minNoticeDays**: Minimum advance notice required
- **maxConsecutiveDays**: Maximum consecutive days allowed

## Leave Balances

**Ledger-based design** — balances are never silently mutated.

Each change creates a `LeaveBalanceTransaction`:
- `OPENING`: Opening balance from previous year
- `ACCRUAL`: Periodic accrual
- `CONSUMPTION`: Approved request consumption
- `REVERSAL`: Cancellation reversal
- `CARRY_FORWARD`: Forward from previous year
- `ADJUSTMENT`: Manual HR adjustment
- `EXPIRY`: Expired unused days

## Leave Requests

### State Machine

```
DRAFT → PENDING → APPROVED
                → REJECTED
                → CANCELLED
APPROVED → CANCELLED
```

Invalid transitions are rejected by the server.

### Duration Calculation

Duration is **always calculated server-side** (never trusted from client):
- Excludes weekends (Saturday/Sunday)
- Excludes holidays
- Supports full-day, half-day, and hourly units

### Overlap Prevention

Requests with overlapping dates and PENDING/APPROVED status are rejected.

### Balance Validation

Before approval, the system validates:
- Available balance >= requested duration
- Paid leave requires sufficient balance
- Unpaid leave allowed per policy

## Approval Workflow

1. Employee creates request (DRAFT)
2. Employee submits (PENDING)
3. Manager/HR reviews
4. Approve: consumes balance, creates ledger transaction
5. Reject: records rejection reason
6. Cancel: reverses balance if previously approved

## Attendance Integration

Approved leave creates `ON_LEAVE` status in attendance. Raw attendance events are **never deleted** due to leave.

## API Endpoints

```
POST   /leave/types           - Create leave type
GET    /leave/types           - List leave types
GET    /leave/types/:id       - Get leave type
PATCH  /leave/types/:id       - Update leave type

POST   /leave/policies        - Create leave policy
GET    /leave/policies        - List leave policies
GET    /leave/policies/:id    - Get leave policy
PATCH  /leave/policies/:id    - Update leave policy

GET    /leave/balances        - List balances
POST   /leave/balances/adjust - Manual balance adjustment

POST   /leave/requests        - Create leave request
GET    /leave/requests        - List leave requests
GET    /leave/requests/:id    - Get leave request
POST   /leave/requests/:id/submit  - Submit request
POST   /leave/requests/:id/approve - Approve request
POST   /leave/requests/:id/reject  - Reject request
POST   /leave/requests/:id/cancel  - Cancel request

POST   /leave/holidays        - Create holiday
GET    /leave/holidays        - List holidays
PATCH  /leave/holidays/:id    - Update holiday

GET    /leave/calendar        - Get leave calendar
```

## RBAC Permissions

- `leave:read`, `leave:create`, `leave:submit`, `leave:approve`, `leave:reject`, `leave:cancel`, `leave:manage`
- `leave.balance:read`, `leave.balance:adjust`
- `leave.policy:read`, `leave.policy:manage`
- `leave.type:read`, `leave.type:manage`

## Tenant Security

All queries are tenant-scoped. Cross-tenant access is forbidden.

## Payroll Contract

Phase 8 Payroll can consume:
- Approved paid leave days
- Approved unpaid leave days
- Leave period
- Employee ID
- Tenant ID
- Authoritative duration (integer days)
