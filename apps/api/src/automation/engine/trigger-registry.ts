/**
 * FusionOS Automation Trigger Registry
 *
 * Maps real domain events to supported automation triggers.
 * Only events that actually exist in the FusionOS system are registered.
 * The frontend consumes this registry to populate trigger configuration UI.
 */

export interface TriggerDefinition {
  eventType: string;
  entityType: string;
  entityLabel: string;
  eventLabel: string;
  module: string;
  /** Available fields for conditions when this trigger fires */
  availableFields: FieldDefinition[];
}

export interface FieldDefinition {
  entity: string;
  field: string;
  label: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ENUM' | 'DATE' | 'NULL';
  enumValues?: string[];
  /** Whether this field can appear in conditions */
  allowed: boolean;
}

/**
 * Registry of all supported automation triggers.
 * Each entry maps a real domain event to its metadata and available condition fields.
 */
export const TRIGGER_REGISTRY: TriggerDefinition[] = [
  // ── Employee ────────────────────────────────────────────────────────────
  {
    eventType: 'employee.created',
    entityType: 'Employee',
    entityLabel: 'Employee',
    eventLabel: 'Created',
    module: 'People',
    availableFields: [
      { entity: 'employee', field: 'status', label: 'Employment Status', type: 'ENUM', enumValues: ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'RETIRED', 'INACTIVE'], allowed: true },
      { entity: 'employee', field: 'department', label: 'Department', type: 'STRING', allowed: true },
      { entity: 'employee', field: 'designation', label: 'Designation', type: 'STRING', allowed: true },
      { entity: 'employee', field: 'branch', label: 'Branch', type: 'STRING', allowed: true },
      { entity: 'employee', field: 'employmentType', label: 'Employment Type', type: 'ENUM', enumValues: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY'], allowed: true },
      { entity: 'employee', field: 'joiningDate', label: 'Joining Date', type: 'DATE', allowed: true },
    ],
  },
  {
    eventType: 'employee.status_changed',
    entityType: 'Employee',
    entityLabel: 'Employee',
    eventLabel: 'Status Changed',
    module: 'People',
    availableFields: [
      { entity: 'employee', field: 'status', label: 'Employment Status', type: 'ENUM', enumValues: ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'RETIRED', 'INACTIVE'], allowed: true },
      { entity: 'employee', field: 'department', label: 'Department', type: 'STRING', allowed: true },
    ],
  },

  // ── Leave ───────────────────────────────────────────────────────────────
  {
    eventType: 'leave.submitted',
    entityType: 'LeaveRequest',
    entityLabel: 'Leave Request',
    eventLabel: 'Submitted',
    module: 'People',
    availableFields: [
      { entity: 'leave', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], allowed: true },
      { entity: 'leave', field: 'days', label: 'Days', type: 'NUMBER', allowed: true },
      { entity: 'leave', field: 'leaveType', label: 'Leave Type', type: 'STRING', allowed: true },
    ],
  },
  {
    eventType: 'leave.approved',
    entityType: 'LeaveRequest',
    entityLabel: 'Leave Request',
    eventLabel: 'Approved',
    module: 'People',
    availableFields: [
      { entity: 'leave', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['APPROVED'], allowed: true },
      { entity: 'leave', field: 'days', label: 'Days', type: 'NUMBER', allowed: true },
    ],
  },
  {
    eventType: 'leave.rejected',
    entityType: 'LeaveRequest',
    entityLabel: 'Leave Request',
    eventLabel: 'Rejected',
    module: 'People',
    availableFields: [
      { entity: 'leave', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['REJECTED'], allowed: true },
    ],
  },

  // ── Attendance ──────────────────────────────────────────────────────────
  {
    eventType: 'attendance.exception',
    entityType: 'Attendance',
    entityLabel: 'Attendance',
    eventLabel: 'Exception',
    module: 'People',
    availableFields: [
      { entity: 'attendance', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['ABSENT', 'LATE', 'EARLY_DEPARTURE', 'INCOMPLETE'], allowed: true },
      { entity: 'attendance', field: 'lateMinutes', label: 'Late Minutes', type: 'NUMBER', allowed: true },
    ],
  },

  // ── Payroll ─────────────────────────────────────────────────────────────
  {
    eventType: 'payroll.finalized',
    entityType: 'PayrollRun',
    entityLabel: 'Payroll Run',
    eventLabel: 'Finalized',
    module: 'People',
    availableFields: [
      { entity: 'payroll', field: 'totalGross', label: 'Total Gross', type: 'NUMBER', allowed: true },
      { entity: 'payroll', field: 'totalNet', label: 'Total Net', type: 'NUMBER', allowed: true },
      { entity: 'payroll', field: 'employeeCount', label: 'Employee Count', type: 'NUMBER', allowed: true },
    ],
  },

  // ── Finance / Invoices ──────────────────────────────────────────────────
  {
    eventType: 'invoice.created',
    entityType: 'Invoice',
    entityLabel: 'Invoice',
    eventLabel: 'Created',
    module: 'Finance',
    availableFields: [
      { entity: 'invoice', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'], allowed: true },
      { entity: 'invoice', field: 'amount', label: 'Amount', type: 'NUMBER', allowed: true },
      { entity: 'invoice', field: 'daysOverdue', label: 'Days Overdue', type: 'NUMBER', allowed: true },
    ],
  },
  {
    eventType: 'invoice.overdue',
    entityType: 'Invoice',
    entityLabel: 'Invoice',
    eventLabel: 'Becomes Overdue',
    module: 'Finance',
    availableFields: [
      { entity: 'invoice', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['ISSUED', 'PARTIALLY_PAID'], allowed: true },
      { entity: 'invoice', field: 'amount', label: 'Amount', type: 'NUMBER', allowed: true },
      { entity: 'invoice', field: 'daysOverdue', label: 'Days Overdue', type: 'NUMBER', allowed: true },
    ],
  },
  {
    eventType: 'invoice.paid',
    entityType: 'Invoice',
    entityLabel: 'Invoice',
    eventLabel: 'Paid',
    module: 'Finance',
    availableFields: [
      { entity: 'invoice', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['PAID'], allowed: true },
      { entity: 'invoice', field: 'amount', label: 'Amount', type: 'NUMBER', allowed: true },
    ],
  },

  // ── Expenses ────────────────────────────────────────────────────────────
  {
    eventType: 'expense.submitted',
    entityType: 'Expense',
    entityLabel: 'Expense',
    eventLabel: 'Submitted',
    module: 'Finance',
    availableFields: [
      { entity: 'expense', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['SUBMITTED'], allowed: true },
      { entity: 'expense', field: 'amount', label: 'Amount', type: 'NUMBER', allowed: true },
      { entity: 'expense', field: 'category', label: 'Category', type: 'STRING', allowed: true },
    ],
  },
  {
    eventType: 'expense.approved',
    entityType: 'Expense',
    entityLabel: 'Expense',
    eventLabel: 'Approved',
    module: 'Finance',
    availableFields: [
      { entity: 'expense', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['APPROVED'], allowed: true },
    ],
  },

  // ── CRM / Leads ─────────────────────────────────────────────────────────
  {
    eventType: 'lead.created',
    entityType: 'Lead',
    entityLabel: 'Lead',
    eventLabel: 'Created',
    module: 'CRM',
    availableFields: [
      { entity: 'lead', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'], allowed: true },
      { entity: 'lead', field: 'source', label: 'Source', type: 'ENUM', enumValues: ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL_CAMPAIGN', 'SOCIAL_MEDIA', 'TRADE_SHOW', 'PARTNER', 'ORGANIC', 'OTHER'], allowed: true },
    ],
  },
  {
    eventType: 'lead.stage_changed',
    entityType: 'Lead',
    entityLabel: 'Lead',
    eventLabel: 'Stage Changed',
    module: 'CRM',
    availableFields: [
      { entity: 'lead', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'], allowed: true },
    ],
  },
  {
    eventType: 'lead.converted',
    entityType: 'Lead',
    entityLabel: 'Lead',
    eventLabel: 'Converted',
    module: 'CRM',
    availableFields: [
      { entity: 'lead', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['CONVERTED'], allowed: true },
    ],
  },

  // ── CRM / Opportunities ─────────────────────────────────────────────────
  {
    eventType: 'opportunity.created',
    entityType: 'Opportunity',
    entityLabel: 'Opportunity',
    eventLabel: 'Created',
    module: 'CRM',
    availableFields: [
      { entity: 'opportunity', field: 'stage', label: 'Stage', type: 'ENUM', enumValues: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'], allowed: true },
      { entity: 'opportunity', field: 'amount', label: 'Amount', type: 'NUMBER', allowed: true },
      { entity: 'opportunity', field: 'probability', label: 'Probability %', type: 'NUMBER', allowed: true },
    ],
  },
  {
    eventType: 'opportunity.stage_changed',
    entityType: 'Opportunity',
    entityLabel: 'Opportunity',
    eventLabel: 'Stage Changed',
    module: 'CRM',
    availableFields: [
      { entity: 'opportunity', field: 'stage', label: 'Stage', type: 'ENUM', enumValues: ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'], allowed: true },
      { entity: 'opportunity', field: 'amount', label: 'Amount', type: 'NUMBER', allowed: true },
    ],
  },
  {
    eventType: 'opportunity.won',
    entityType: 'Opportunity',
    entityLabel: 'Opportunity',
    eventLabel: 'Won',
    module: 'CRM',
    availableFields: [
      { entity: 'opportunity', field: 'stage', label: 'Stage', type: 'ENUM', enumValues: ['CLOSED_WON'], allowed: true },
      { entity: 'opportunity', field: 'amount', label: 'Amount', type: 'NUMBER', allowed: true },
    ],
  },
  {
    eventType: 'opportunity.lost',
    entityType: 'Opportunity',
    entityLabel: 'Opportunity',
    eventLabel: 'Lost',
    module: 'CRM',
    availableFields: [
      { entity: 'opportunity', field: 'stage', label: 'Stage', type: 'ENUM', enumValues: ['CLOSED_LOST'], allowed: true },
    ],
  },

  // ── Projects ────────────────────────────────────────────────────────────
  {
    eventType: 'project.created',
    entityType: 'Project',
    entityLabel: 'Project',
    eventLabel: 'Created',
    module: 'Projects',
    availableFields: [
      { entity: 'project', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['DRAFT', 'PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'], allowed: true },
      { entity: 'project', field: 'progress', label: 'Progress %', type: 'NUMBER', allowed: true },
    ],
  },
  {
    eventType: 'project.status_changed',
    entityType: 'Project',
    entityLabel: 'Project',
    eventLabel: 'Status Changed',
    module: 'Projects',
    availableFields: [
      { entity: 'project', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['DRAFT', 'PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'], allowed: true },
    ],
  },
  {
    eventType: 'project.task.completed',
    entityType: 'ProjectTask',
    entityLabel: 'Project Task',
    eventLabel: 'Completed',
    module: 'Projects',
    availableFields: [
      { entity: 'task', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['COMPLETED'], allowed: true },
      { entity: 'task', field: 'priority', label: 'Priority', type: 'ENUM', enumValues: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], allowed: true },
    ],
  },

  // ── Documents ───────────────────────────────────────────────────────────
  {
    eventType: 'document.created',
    entityType: 'Document',
    entityLabel: 'Document',
    eventLabel: 'Uploaded',
    module: 'Documents',
    availableFields: [
      { entity: 'document', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['ACTIVE', 'ARCHIVED', 'TRASHED'], allowed: true },
      { entity: 'document', field: 'category', label: 'Category', type: 'STRING', allowed: true },
    ],
  },

  // ── Assets ──────────────────────────────────────────────────────────────
  {
    eventType: 'asset.created',
    entityType: 'Asset',
    entityLabel: 'Asset',
    eventLabel: 'Created',
    module: 'Assets',
    availableFields: [
      { entity: 'asset', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['DRAFT', 'ACTIVE', 'ASSIGNED', 'IN_MAINTENANCE', 'IN_REPAIR', 'AVAILABLE', 'LOST', 'DAMAGED', 'DISPOSED', 'RETIRED'], allowed: true },
      { entity: 'asset', field: 'categoryType', label: 'Category Type', type: 'ENUM', enumValues: ['IT_EQUIPMENT', 'OFFICE_EQUIPMENT', 'FURNITURE', 'VEHICLE', 'MACHINERY', 'TOOLS', 'SOFTWARE', 'OTHER'], allowed: true },
    ],
  },
  {
    eventType: 'asset.status_changed',
    entityType: 'Asset',
    entityLabel: 'Asset',
    eventLabel: 'Status Changed',
    module: 'Assets',
    availableFields: [
      { entity: 'asset', field: 'status', label: 'Status', type: 'ENUM', enumValues: ['DRAFT', 'ACTIVE', 'ASSIGNED', 'IN_MAINTENANCE', 'IN_REPAIR', 'AVAILABLE', 'LOST', 'DAMAGED', 'DISPOSED', 'RETIRED'], allowed: true },
    ],
  },
];

/**
 * Look up a trigger definition by event type.
 */
export function getTriggerByEventType(eventType: string): TriggerDefinition | undefined {
  return TRIGGER_REGISTRY.find((t) => t.eventType === eventType);
}

/**
 * Get all available entity types for the trigger registry.
 */
export function getEntityTypes(): string[] {
  return [...new Set(TRIGGER_REGISTRY.map((t) => t.entityType))];
}

/**
 * Get all available modules for the trigger registry.
 */
export function getModules(): string[] {
  return [...new Set(TRIGGER_REGISTRY.map((t) => t.module))];
}
