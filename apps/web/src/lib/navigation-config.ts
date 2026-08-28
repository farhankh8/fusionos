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
        label: 'Home',
        href: '/',
        icon: 'home',
        isImplemented: true,
      },
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: 'dashboard',
        isImplemented: true,
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
        isImplemented: true,
      },
      {
        label: 'Branches',
        href: '/organization/branches',
        isImplemented: true,
      },
      {
        label: 'Departments',
        href: '/organization/departments',
        isImplemented: true,
      },
      {
        label: 'Teams',
        href: '/organization/teams',
        isImplemented: true,
      },
      {
        label: 'Designations',
        href: '/organization/designations',
        isImplemented: true,
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
        isImplemented: true,
      },
      {
        label: 'Attendance',
        href: '/people/attendance',
        isImplemented: true,
      },
      {
        label: 'Leave',
        href: '/people/leave',
        isImplemented: true,
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
        isImplemented: true,
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
        href: '/settings/users',
        isImplemented: true,
      },
      {
        label: 'Roles',
        href: '/settings/roles',
        isImplemented: true,
      },
      {
        label: 'Permissions',
        href: '/admin/permissions',
        isImplemented: false,
      },
      {
        label: 'Settings',
        href: '/settings',
        isImplemented: true,
      },
      {
        label: 'Audit',
        href: '/admin/audit',
        isImplemented: false,
      },
    ],
  },
];
