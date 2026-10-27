export interface ScopeDefinition {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'operations' | 'management';
}

export const AVAILABLE_SCOPES: ScopeDefinition[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'View garage KPIs, recent bills overview, and inventory alerts',
    category: 'core'
  },
  {
    id: 'job_cards',
    name: 'Job Cards & Quotations',
    description: 'Vehicle intake, condition inspection, technician assignment, extra work, and estimate conversion',
    category: 'operations'
  },
  {
    id: 'bills',
    name: 'Bills & Invoices',
    description: 'Create, edit, view, print invoices, and record customer payments',
    category: 'operations'
  },
  {
    id: 'customers',
    name: 'Customers & Vehicles',
    description: 'Register and manage customer profiles, vehicles, and VIN decoding',
    category: 'operations'
  },
  {
    id: 'spare_parts',
    name: 'Spare Parts & Inventory',
    description: 'Manage spare parts inventory, pricing, and stock adjustments',
    category: 'operations'
  },
  {
    id: 'services',
    name: 'Services Catalog',
    description: 'Manage service rates, repair packages, and estimated durations',
    category: 'operations'
  },
  {
    id: 'financial',
    name: 'Financial Ledger',
    description: 'View financial statements, revenue analytics, and earnings summaries',
    category: 'management'
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'Create staff accounts, configure roles, and assign access scopes',
    category: 'management'
  }
];

export const ROLE_DEFAULT_SCOPES: Record<string, string[]> = {
  MANAGER: ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services', 'financial', 'users'],
  TECHNICIAN: ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services'],
  CUSTOMER: ['bills']
};

export const SCOPE_PRESETS = [
  {
    id: 'all',
    label: 'All Scopes',
    scopes: ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services', 'financial', 'users']
  },
  {
    id: 'technician',
    label: 'Technician Default',
    scopes: ['dashboard', 'job_cards', 'bills', 'customers', 'spare_parts', 'services']
  },
  {
    id: 'billing',
    label: 'Front Desk / Billing',
    scopes: ['bills', 'job_cards', 'customers']
  },
  {
    id: 'inventory',
    label: 'Inventory & Parts',
    scopes: ['spare_parts', 'services']
  }
];
