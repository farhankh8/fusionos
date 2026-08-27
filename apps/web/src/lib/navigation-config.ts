/**
 * FusionOS Navigation Configuration
 *
 * Defines the complete sidebar navigation structure.
 * This is the single source of truth for the application's navigation.
 * Each item maps to a future route.
 */

export interface NavigationItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string;
  children?: NavigationItem[];
  isImplemented: boolean;
}

export interface NavigationGroup {
  label?: string;
  items: NavigationItem[];
}

export const navigation: NavigationGroup[] = [
  // ── Main ────────────────────────────────────────────────────────────────
  {
    items: [
      {
        label: 'Command Center',
        href: '/command-center',
        icon: 'command-center',
        isImplemented: false,
      },
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: 'dashboard',
        isImplemented: false,
      },
    ],
  },

  // ── Organization ────────────────────────────────────────────────────────
  {
    label: 'Organization',
    items: [
      {
        label: 'Company',
        href: '/organization/company',
        isImplemented: false,
      },
      {
        label: 'Branches',
        href: '/organization/branches',
        isImplemented: false,
      },
      {
        label: 'Departments',
        href: '/organization/departments',
        isImplemented: false,
      },
      {
        label: 'Teams',
        href: '/organization/teams',
        isImplemented: false,
      },
    ],
  },

  // ── People ──────────────────────────────────────────────────────────────
  {
    label: 'People',
    items: [
      {
        label: 'Employees',
        href: '/people/employees',
        isImplemented: false,
      },
      {
        label: 'Attendance',
        href: '/people/attendance',
        isImplemented: false,
      },
      {
        label: 'Leave',
        href: '/people/leave',
        isImplemented: false,
      },
      {
        label: 'Payroll',
        href: '/people/payroll',
        isImplemented: false,
      },
    ],
  },

  // ── Finance ─────────────────────────────────────────────────────────────
  {
    label: 'Finance',
    items: [
      {
        label: 'Overview',
        href: '/finance/overview',
        isImplemented: false,
      },
      {
        label: 'Accounts',
        href: '/finance/accounts',
        isImplemented: false,
      },
      {
        label: 'General Ledger',
        href: '/finance/general-ledger',
        isImplemented: false,
      },
      {
        label: 'Invoices',
        href: '/finance/invoices',
        isImplemented: false,
      },
      {
        label: 'Payments',
        href: '/finance/payments',
        isImplemented: false,
      },
      {
        label: 'Expenses',
        href: '/finance/expenses',
        isImplemented: false,
      },
      {
        label: 'Reports',
        href: '/finance/reports',
        isImplemented: false,
      },
    ],
  },

  // ── Business ────────────────────────────────────────────────────────────
  {
    label: 'Business',
    items: [
      {
        label: 'CRM',
        href: '/crm',
        isImplemented: false,
      },
      {
        label: 'Projects',
        href: '/projects',
        isImplemented: false,
      },
      {
        label: 'Assets',
        href: '/assets',
        isImplemented: false,
      },
      {
        label: 'Documents',
        href: '/documents',
        isImplemented: false,
      },
    ],
  },

  // ── Intelligence ────────────────────────────────────────────────────────
  {
    label: 'Intelligence',
    items: [
      {
        label: 'Automation',
        href: '/automation',
        isImplemented: false,
      },
      {
        label: 'AI Command Center',
        href: '/ai',
        isImplemented: false,
      },
      {
        label: 'Analytics',
        href: '/analytics',
        isImplemented: false,
      },
      {
        label: 'Reports',
        href: '/reports',
        isImplemented: false,
      },
    ],
  },

  // ── Administration ──────────────────────────────────────────────────────
  {
    label: 'Administration',
    items: [
      {
        label: 'Users',
        href: '/admin/users',
        isImplemented: false,
      },
      {
        label: 'Roles',
        href: '/admin/roles',
        isImplemented: false,
      },
      {
        label: 'Permissions',
        href: '/admin/permissions',
        isImplemented: false,
      },
      {
        label: 'Company Settings',
        href: '/admin/settings',
        isImplemented: false,
      },
      {
        label: 'Audit',
        href: '/admin/audit',
        isImplemented: false,
      },
    ],
  },
];
