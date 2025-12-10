/**
 * Table migration configuration
 * Defines the order and phases for migrating tables
 * Order respects foreign key dependencies
 */

import { MigrationConfig, TableMigrationPhase } from './types';

/**
 * Table migration order organized by phases
 * Each phase contains tables with no dependencies on tables in later phases
 */
export const TABLE_MIGRATION_PHASES: TableMigrationPhase[] = [
  {
    phase: 1,
    description: 'Independent lookup tables (no foreign key dependencies)',
    tables: [
      'crm_Industry_Type',
      'Documents_Types',
      'invoice_States',
      'system_Modules_Enabled',
      'modulStatus',
      'systemServices',
      'gpt_models',
    ],
  },
  {
    phase: 2,
    description: 'Core entity tables (independent or minimal dependencies)',
    tables: [
      'Users',
      'MyAccount',
      'Employees',
      'ImageUpload',
      'TodoList',
    ],
  },
  {
    phase: 3,
    description: 'CRM campaign and opportunity configuration tables',
    tables: [
      'crm_campaigns',
      'crm_Opportunities_Sales_Stages',
      'crm_Opportunities_Type',
    ],
  },
  {
    phase: 4,
    description: 'CRM core tables (accounts first, then dependent tables)',
    tables: [
      'crm_Accounts',      // Depends on: Users, crm_Industry_Type
      'crm_Contacts',      // Depends on: Users, crm_Accounts
      'crm_Leads',         // Depends on: Users, crm_Accounts
      'crm_Contracts',     // Depends on: Users, crm_Accounts
    ],
  },
  {
    phase: 5,
    description: 'CRM opportunities (depends on multiple CRM tables)',
    tables: [
      'crm_Opportunities', // Depends on: Users, crm_Accounts, crm_campaigns, crm_Contacts, crm_Opportunities_Sales_Stages, crm_Opportunities_Type
    ],
  },
  {
    phase: 6,
    description: 'Task and board tables',
    tables: [
      'Boards',             // Depends on: Users
      'Sections',           // Depends on: Boards
      'Tasks',              // Depends on: Users, Sections
      'crm_Accounts_Tasks', // Depends on: Users, crm_Accounts
    ],
  },
  {
    phase: 7,
    description: 'Task comments (depends on tasks)',
    tables: [
      'tasksComments',      // Depends on: Users, Tasks, crm_Accounts_Tasks
    ],
  },
  {
    phase: 8,
    description: 'Document and invoice tables',
    tables: [
      'Documents',  // Depends on: Users, Documents_Types
      'Invoices',   // Depends on: Users, crm_Accounts, invoice_States
    ],
  },
  {
    phase: 9,
    description: 'Integration tables',
    tables: [
      'secondBrain_notions', // Depends on: Users
      'openAi_keys',         // Depends on: Users
    ],
  },
  {
    phase: 10,
    description: 'Junction tables (many-to-many relationships)',
    tables: [
      'DocumentsToInvoices',
      'DocumentsToOpportunities',
      'DocumentsToContacts',
      'DocumentsToTasks',
      'DocumentsToCrmAccountsTasks',
      'DocumentsToLeads',
      'DocumentsToAccounts',
      'ContactsToOpportunities',
      'AccountWatchers',
      'BoardWatchers',
    ],
  },
];

/**
 * Default migration configuration
 */
export const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  batchSize: 1000,
  tableOrder: TABLE_MIGRATION_PHASES,
  checkpointInterval: 10, // Save checkpoint every 10 batches
};

/**
 * Gets all table names in migration order
 */
export function getAllTableNames(): string[] {
  return TABLE_MIGRATION_PHASES.flatMap(phase => phase.tables);
}

/**
 * Gets phase number for a table
 */
export function getTablePhase(tableName: string): number | undefined {
  for (const phase of TABLE_MIGRATION_PHASES) {
    if (phase.tables.includes(tableName)) {
      return phase.phase;
    }
  }
  return undefined;
}

/**
 * Checks if a table is a junction table
 */
export function isJunctionTable(tableName: string): boolean {
  const junctionPhase = TABLE_MIGRATION_PHASES.find(p => p.phase === 10);
  return junctionPhase?.tables.includes(tableName) || false;
}

/**
 * Gets tables in a specific phase
 */
export function getTablesInPhase(phaseNumber: number): string[] {
  const phase = TABLE_MIGRATION_PHASES.find(p => p.phase === phaseNumber);
  return phase?.tables || [];
}

/**
 * Gets total number of phases
 */
export function getTotalPhases(): number {
  return TABLE_MIGRATION_PHASES.length;
}

/**
 * Gets total number of tables
 */
export function getTotalTables(): number {
  return getAllTableNames().length;
}

/**
 * Validates that all required tables are in the configuration
 */
export function validateTableConfiguration(requiredTables: string[]): {
  valid: boolean;
  missing: string[];
  extra: string[];
} {
  const configuredTables = new Set(getAllTableNames());
  const required = new Set(requiredTables);

  const missing = requiredTables.filter(t => !configuredTables.has(t));
  const extra = getAllTableNames().filter(t => !required.has(t));

  return {
    valid: missing.length === 0,
    missing,
    extra,
  };
}
