/**
 * Table schema configuration for validation
 * Defines foreign keys and field types for each table
 */

export interface TableSchema {
  tableName: string;
  foreignKeys: Array<{
    field: string;
    referencedTable: string;
  }>;
  fieldDefinitions: Array<{
    name: string;
    type: 'DateTime' | 'Enum' | 'JSONB' | 'Array' | 'Number' | 'Boolean';
    enumValues?: string[];
  }>;
}

/**
 * Entity tables to validate (26 models)
 */
export const ENTITY_TABLES = [
  // System & Configuration
  'Users',
  'system_Modules_Enabled',
  'modulStatus',
  'systemServices',
  'MyAccount',

  // Lookup tables
  'crm_Industry_Type',
  'Documents_Types',
  'invoice_States',
  'crm_Opportunities_Sales_Stages',
  'crm_Opportunities_Type',

  // Core entities
  'crm_Accounts',
  'crm_Contacts',
  'crm_Leads',
  'crm_Opportunities',
  'crm_Contracts',
  'crm_campaigns',

  // Tasks & Projects
  'Boards',
  'Sections',
  'Tasks',
  'crm_Accounts_Tasks',
  'tasksComments',

  // Documents & Invoices
  'Documents',
  'Invoices',

  // Other
  'Employees',
  'ImageUpload',
  'TodoList',
  'secondBrain_notions',
  'openAi_keys',
  'gpt_models',
];

/**
 * Junction tables to validate (10 tables)
 */
export const JUNCTION_TABLES = [
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
];

/**
 * Table schemas with foreign key definitions
 */
export const TABLE_SCHEMAS: Record<string, TableSchema> = {
  // Users
  Users: {
    tableName: 'Users',
    foreignKeys: [],
    fieldDefinitions: [
      { name: 'userStatus', type: 'Enum', enumValues: ['ACTIVE', 'INACTIVE', 'PENDING'] },
      { name: 'userLanguage', type: 'Enum', enumValues: ['cz', 'en', 'de', 'uk'] },
      { name: 'is_admin', type: 'Boolean' },
      { name: 'is_account_admin', type: 'Boolean' },
      { name: 'created_on', type: 'DateTime' },
      { name: 'lastLoginAt', type: 'DateTime' },
    ],
  },

  // CRM Accounts
  crm_Accounts: {
    tableName: 'crm_Accounts',
    foreignKeys: [
      { field: 'assigned_to', referencedTable: 'Users' },
      { field: 'industry', referencedTable: 'crm_Industry_Type' },
      { field: 'createdBy', referencedTable: 'Users' },
      { field: 'updatedBy', referencedTable: 'Users' },
    ],
    fieldDefinitions: [
      { name: 'status', type: 'Enum', enumValues: ['ACTIVE', 'INACTIVE', 'PENDING'] },
      { name: 'createdAt', type: 'DateTime' },
      { name: 'updatedAt', type: 'DateTime' },
    ],
  },

  // CRM Contacts
  crm_Contacts: {
    tableName: 'crm_Contacts',
    foreignKeys: [
      { field: 'assigned_to', referencedTable: 'Users' },
      { field: 'created_by', referencedTable: 'Users' },
      { field: 'createdBy', referencedTable: 'Users' },
      { field: 'updatedBy', referencedTable: 'Users' },
    ],
    fieldDefinitions: [
      { name: 'status', type: 'Enum', enumValues: ['ACTIVE', 'INACTIVE', 'PENDING'] },
      { name: 'type', type: 'Enum', enumValues: ['Customer', 'Partner', 'Vendor', 'Prospect'] },
      { name: 'tags', type: 'Array' },
      { name: 'notes', type: 'Array' },
      { name: 'cratedAt', type: 'DateTime' },
      { name: 'last_activity', type: 'DateTime' },
    ],
  },

  // CRM Leads
  crm_Leads: {
    tableName: 'crm_Leads',
    foreignKeys: [
      { field: 'assigned_to', referencedTable: 'Users' },
      { field: 'createdBy', referencedTable: 'Users' },
      { field: 'updatedBy', referencedTable: 'Users' },
    ],
    fieldDefinitions: [
      { name: 'status', type: 'Enum', enumValues: ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST'] },
      { name: 'type', type: 'Enum', enumValues: ['DEMO'] },
      { name: 'createdAt', type: 'DateTime' },
    ],
  },

  // CRM Opportunities
  crm_Opportunities: {
    tableName: 'crm_Opportunities',
    foreignKeys: [
      { field: 'account', referencedTable: 'crm_Accounts' },
      { field: 'assigned_to', referencedTable: 'Users' },
      { field: 'campaign', referencedTable: 'crm_campaigns' },
      { field: 'contact', referencedTable: 'crm_Contacts' },
      { field: 'created_by', referencedTable: 'Users' },
      { field: 'sales_stage', referencedTable: 'crm_Opportunities_Sales_Stages' },
      { field: 'type', referencedTable: 'crm_Opportunities_Type' },
    ],
    fieldDefinitions: [
      { name: 'status', type: 'Enum', enumValues: ['ACTIVE', 'INACTIVE', 'PENDING', 'CLOSED'] },
      { name: 'createdAt', type: 'DateTime' },
      { name: 'close_date', type: 'DateTime' },
    ],
  },

  // CRM Contracts
  crm_Contracts: {
    tableName: 'crm_Contracts',
    foreignKeys: [
      { field: 'account', referencedTable: 'crm_Accounts' },
      { field: 'assigned_to', referencedTable: 'Users' },
      { field: 'createdBy', referencedTable: 'Users' },
      { field: 'updatedBy', referencedTable: 'Users' },
    ],
    fieldDefinitions: [
      { name: 'status', type: 'Enum', enumValues: ['NOTSTARTED', 'INPROGRESS', 'SIGNED'] },
      { name: 'startDate', type: 'DateTime' },
      { name: 'endDate', type: 'DateTime' },
      { name: 'createdAt', type: 'DateTime' },
    ],
  },

  // Tasks
  Tasks: {
    tableName: 'Tasks',
    foreignKeys: [
      { field: 'user', referencedTable: 'Users' },
      { field: 'section', referencedTable: 'Sections' },
      { field: 'createdBy', referencedTable: 'Users' },
      { field: 'updatedBy', referencedTable: 'Users' },
    ],
    fieldDefinitions: [
      { name: 'taskStatus', type: 'Enum', enumValues: ['ACTIVE', 'PENDING', 'COMPLETE'] },
      { name: 'tags', type: 'JSONB' },
      { name: 'dueDateAt', type: 'DateTime' },
      { name: 'createdAt', type: 'DateTime' },
    ],
  },

  // CRM Accounts Tasks
  crm_Accounts_Tasks: {
    tableName: 'crm_Accounts_Tasks',
    foreignKeys: [
      { field: 'user', referencedTable: 'Users' },
      { field: 'account', referencedTable: 'crm_Accounts' },
      { field: 'createdBy', referencedTable: 'Users' },
      { field: 'updatedBy', referencedTable: 'Users' },
    ],
    fieldDefinitions: [
      { name: 'taskStatus', type: 'Enum', enumValues: ['ACTIVE', 'PENDING', 'COMPLETE'] },
      { name: 'tags', type: 'JSONB' },
      { name: 'dueDateAt', type: 'DateTime' },
      { name: 'createdAt', type: 'DateTime' },
    ],
  },

  // Boards
  Boards: {
    tableName: 'Boards',
    foreignKeys: [
      { field: 'user', referencedTable: 'Users' },
      { field: 'createdBy', referencedTable: 'Users' },
      { field: 'updatedBy', referencedTable: 'Users' },
    ],
    fieldDefinitions: [
      { name: 'favourite', type: 'Boolean' },
      { name: 'sharedWith', type: 'Array' },
      { name: 'createdAt', type: 'DateTime' },
    ],
  },

  // Sections
  Sections: {
    tableName: 'Sections',
    foreignKeys: [
      { field: 'board', referencedTable: 'Boards' },
    ],
    fieldDefinitions: [],
  },

  // Documents
  Documents: {
    tableName: 'Documents',
    foreignKeys: [
      { field: 'created_by_user', referencedTable: 'Users' },
      { field: 'assigned_user', referencedTable: 'Users' },
      { field: 'document_type', referencedTable: 'Documents_Types' },
      { field: 'createdBy', referencedTable: 'Users' },
      { field: 'updatedBy', referencedTable: 'Users' },
    ],
    fieldDefinitions: [
      { name: 'status', type: 'Enum', enumValues: ['ACTIVE', 'INACTIVE', 'PENDING'] },
      { name: 'document_system_type', type: 'Enum', enumValues: ['INVOICE', 'RECEIPT', 'CONTRACT', 'OFFER', 'OTHER'] },
      { name: 'favourite', type: 'Boolean' },
      { name: 'tags', type: 'JSONB' },
      { name: 'createdAt', type: 'DateTime' },
    ],
  },

  // Invoices
  Invoices: {
    tableName: 'Invoices',
    foreignKeys: [
      { field: 'invoice_state_id', referencedTable: 'invoice_States' },
      { field: 'assigned_user_id', referencedTable: 'Users' },
      { field: 'assigned_account_id', referencedTable: 'crm_Accounts' },
      { field: 'last_updated_by', referencedTable: 'Users' },
    ],
    fieldDefinitions: [
      { name: 'status', type: 'Enum', enumValues: ['ACTIVE', 'INACTIVE', 'PENDING'] },
      { name: 'favorite', type: 'Boolean' },
      { name: 'invoice_items', type: 'JSONB' },
      { name: 'date_created', type: 'DateTime' },
      { name: 'date_due', type: 'DateTime' },
    ],
  },

  // Task Comments
  tasksComments: {
    tableName: 'tasksComments',
    foreignKeys: [
      { field: 'created_by', referencedTable: 'Users' },
      { field: 'task_id', referencedTable: 'Tasks' },
      { field: 'crm_accounts_task_id', referencedTable: 'crm_Accounts_Tasks' },
    ],
    fieldDefinitions: [
      { name: 'created_on', type: 'DateTime' },
    ],
  },

  // Other tables with minimal validation
  crm_campaigns: {
    tableName: 'crm_campaigns',
    foreignKeys: [],
    fieldDefinitions: [],
  },
  crm_Industry_Type: {
    tableName: 'crm_Industry_Type',
    foreignKeys: [],
    fieldDefinitions: [],
  },
  crm_Opportunities_Sales_Stages: {
    tableName: 'crm_Opportunities_Sales_Stages',
    foreignKeys: [],
    fieldDefinitions: [],
  },
  crm_Opportunities_Type: {
    tableName: 'crm_Opportunities_Type',
    foreignKeys: [],
    fieldDefinitions: [],
  },
  Documents_Types: {
    tableName: 'Documents_Types',
    foreignKeys: [],
    fieldDefinitions: [],
  },
  invoice_States: {
    tableName: 'invoice_States',
    foreignKeys: [],
    fieldDefinitions: [],
  },
  system_Modules_Enabled: {
    tableName: 'system_Modules_Enabled',
    foreignKeys: [],
    fieldDefinitions: [],
  },
  modulStatus: {
    tableName: 'modulStatus',
    foreignKeys: [],
    fieldDefinitions: [
      { name: 'status', type: 'Enum', enumValues: ['ACTIVE', 'INACTIVE'] },
    ],
  },
  systemServices: {
    tableName: 'systemServices',
    foreignKeys: [],
    fieldDefinitions: [],
  },
  MyAccount: {
    tableName: 'MyAccount',
    foreignKeys: [],
    fieldDefinitions: [],
  },
  Employees: {
    tableName: 'Employees',
    foreignKeys: [],
    fieldDefinitions: [],
  },
  ImageUpload: {
    tableName: 'ImageUpload',
    foreignKeys: [],
    fieldDefinitions: [],
  },
  TodoList: {
    tableName: 'TodoList',
    foreignKeys: [
      { field: 'userId', referencedTable: 'Users' },
    ],
    fieldDefinitions: [],
  },
  secondBrain_notions: {
    tableName: 'secondBrain_notions',
    foreignKeys: [
      { field: 'userId', referencedTable: 'Users' },
    ],
    fieldDefinitions: [],
  },
  openAi_keys: {
    tableName: 'openAi_keys',
    foreignKeys: [
      { field: 'user_id', referencedTable: 'Users' },
    ],
    fieldDefinitions: [],
  },
  gpt_models: {
    tableName: 'gpt_models',
    foreignKeys: [],
    fieldDefinitions: [
      { name: 'status', type: 'Enum', enumValues: ['ACTIVE', 'INACTIVE'] },
    ],
  },
};

/**
 * Junction table configurations
 */
export const JUNCTION_TABLE_CONFIGS = [
  {
    tableName: 'DocumentsToInvoices',
    field1: { name: 'document_id', referencedTable: 'Documents' },
    field2: { name: 'invoice_id', referencedTable: 'Invoices' },
  },
  {
    tableName: 'DocumentsToOpportunities',
    field1: { name: 'document_id', referencedTable: 'Documents' },
    field2: { name: 'opportunity_id', referencedTable: 'crm_Opportunities' },
  },
  {
    tableName: 'DocumentsToContacts',
    field1: { name: 'document_id', referencedTable: 'Documents' },
    field2: { name: 'contact_id', referencedTable: 'crm_Contacts' },
  },
  {
    tableName: 'DocumentsToTasks',
    field1: { name: 'document_id', referencedTable: 'Documents' },
    field2: { name: 'task_id', referencedTable: 'Tasks' },
  },
  {
    tableName: 'DocumentsToCrmAccountsTasks',
    field1: { name: 'document_id', referencedTable: 'Documents' },
    field2: { name: 'crm_accounts_task_id', referencedTable: 'crm_Accounts_Tasks' },
  },
  {
    tableName: 'DocumentsToLeads',
    field1: { name: 'document_id', referencedTable: 'Documents' },
    field2: { name: 'lead_id', referencedTable: 'crm_Leads' },
  },
  {
    tableName: 'DocumentsToAccounts',
    field1: { name: 'document_id', referencedTable: 'Documents' },
    field2: { name: 'account_id', referencedTable: 'crm_Accounts' },
  },
  {
    tableName: 'ContactsToOpportunities',
    field1: { name: 'contact_id', referencedTable: 'crm_Contacts' },
    field2: { name: 'opportunity_id', referencedTable: 'crm_Opportunities' },
  },
  {
    tableName: 'AccountWatchers',
    field1: { name: 'account_id', referencedTable: 'crm_Accounts' },
    field2: { name: 'user_id', referencedTable: 'Users' },
  },
  {
    tableName: 'BoardWatchers',
    field1: { name: 'board_id', referencedTable: 'Boards' },
    field2: { name: 'user_id', referencedTable: 'Users' },
  },
];
