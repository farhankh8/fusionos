# FusionOS Attendance Architecture

## Phase 6 — Attendance Management

### Overview

The Attendance domain captures raw clock events and calculates deterministic daily attendance results. It is the **authoritative source** for time-tracking data consumed by future Leave (Phase 7) and Payroll (Phase 8) modules.

### Core Principle

**Raw events are immutable evidence. Calculated results are derived deterministically.**

```
Raw Events (Evidence)
  ├── CLOCK_IN
  ├── CLOCK_OUT
  ├── BREAK_START
  ├── BREAK_END
  ├── MANUAL_CORRECTION
  └── SYSTEM_ADJUSTMENT
        │
        ▼
  Calculation Engine (Server-side, Deterministic)
        │
        ▼
  Daily Attendance Record (Result)
        │
        ▼
  Future: Leave / Payroll
```

### Database Models

#### AttendanceEvent (Raw Evidence)
- **Immutable** — events are never overwritten
- Captures: employeeId, tenantId, eventType, eventTime, source, idempotencyKey
- Supports idempotent event creation via unique constraint on (tenantId, idempotencyKey)
- Source types: WEB, DESKTOP, MOBILE, BIOMETRIC, ADMIN, IMPORT, API, SYSTEM

#### Attendance (Calculated Result)
- Derived deterministically from raw events
- One record per employee per day (unique on tenantId + employeeId + date)
- Uses integer minutes for all time calculations (never floats)
- Status: PRESENT, ABSENT, HALF_DAY, LATE, EARLY_DEPARTURE, OVERTIME, ON_LEAVE, HOLIDAY, WEEK_OFF, INCOMPLETE
- Record status: DRAFT → CONFIRMED → LOCKED (for future payroll consumption)

#### AttendanceCorrection (Authorized Changes)
- Tracks correction requests with approval workflow
- Status: PENDING → APPROVED / REJECTED
- Original events are preserved; corrections create new events
- Employees cannot approve their own corrections

### Timezone Strategy

- Attendance dates use the **employee's timezone** (fallback: UTC)
- Event timestamps are stored as UTC
- The `getLocalDate()` helper converts UTC timestamps to local dates using `Intl.DateTimeFormat`
- Late/early calculations use local time (e.g., 9:00 AM local start)
- Documented limitation: cross-midnight shifts not fully supported in Phase 6

### Calculation Engine

The `recalculateAttendance()` method runs deterministically:

1. Fetch all events for the employee on the given date
2. Find first clock-in and last clock-out
3. Calculate break minutes (pair BREAK_START with BREAK_END)
4. Calculate total worked minutes (elapsed - breaks)
5. Calculate late minutes (clock-in after 9:00 AM local)
6. Calculate early departure (clock-out before 6:00 PM local)
7. Calculate overtime (worked > 480 minutes)
8. Determine status based on all factors
9. Upsert the attendance record

### Idempotency

Events with the same `idempotencyKey` are not duplicated. The unique constraint on (tenantId, idempotencyKey) prevents duplicate events from web, desktop, or biometric sources.

### Corrections

- Employees request corrections (cannot correct their own attendance)
- HR/Managers review and approve/reject
- Approved corrections create a MANUAL_CORRECTION event and recalculate
- Original events are never destroyed

### RBAC Permissions

| Permission | Description |
|-----------|-------------|
| attendance:read | View attendance records |
| attendance:create | Clock in/out, start/end breaks |
| attendance:correct | Request attendance correction |
| attendance:approve | Approve/reject corrections |
| attendance:manage | Admin attendance management |

### API Endpoints

```
POST   /api/v1/attendance/clock-in
POST   /api/v1/attendance/clock-out
POST   /api/v1/attendance/break-start
POST   /api/v1/attendance/break-end
GET    /api/v1/attendance/today
GET    /api/v1/attendance
GET    /api/v1/attendance/:id
POST   /api/v1/attendance/corrections
GET    /api/v1/attendance/corrections/list
PATCH  /api/v1/attendance/corrections/:id/review
```

### Future Integration

- **Leave (Phase 7)**: Approved leave will set attendance status to ON_LEAVE
- **Payroll (Phase 8)**: Consumes finalized attendance records (totalWorkedMinutes, overtimeMinutes)
- **Desktop (Future)**: Desktop agent → Attendance API → Events → Engine
- **Biometric (Future)**: Biometric device → Attendance API → Events → Engine
