/**
 * Batch Processing and Transaction Logic
 * Handles batch insertion with transaction safety
 */

import { PrismaClient as PrismaClientPG } from '@prisma/client';
import { ErrorLogger } from './error-logger';
import { TransformerFunction } from './transformers';
import { UuidMapper } from './uuid-mapper';

export class BatchProcessor {
  private batchSize: number;
  private errorLogger: ErrorLogger;

  constructor(batchSize: number, errorLogger: ErrorLogger) {
    this.batchSize = batchSize;
    this.errorLogger = errorLogger;
  }

  /**
   * Migrate a batch of records with transaction safety
   * @param pgClient PostgreSQL Prisma client
   * @param tableName Target table name
   * @param mongoRecords MongoDB records to migrate
   * @param transformFn Transformation function
   * @param uuidMapper UUID mapper instance
   * @returns Number of successfully migrated records
   */
  async migrateBatch(
    pgClient: PrismaClientPG,
    tableName: string,
    mongoRecords: any[],
    transformFn: TransformerFunction,
    uuidMapper: UuidMapper
  ): Promise<number> {
    if (mongoRecords.length === 0) return 0;

    try {
      // Transform all records in the batch
      const transformedRecords = mongoRecords.map(mongoRecord => {
        try {
          return transformFn(mongoRecord, uuidMapper);
        } catch (error: any) {
          this.errorLogger.logError(
            tableName,
            mongoRecord._id?.toString() || 'unknown',
            error,
            mongoRecord
          );
          return null;
        }
      }).filter(record => record !== null);

      if (transformedRecords.length === 0) {
        console.warn(`All records failed transformation in batch for table ${tableName}`);
        return 0;
      }

      // Insert batch in a transaction
      const result = await this.insertBatch(pgClient, tableName, transformedRecords);

      return result;
    } catch (error: any) {
      console.error(`Batch processing failed for table ${tableName}:`, error.message);
      // Log all records in the batch as failed
      mongoRecords.forEach(record => {
        this.errorLogger.logError(
          tableName,
          record._id?.toString() || 'unknown',
          error,
          record
        );
      });
      return 0;
    }
  }

  /**
   * Insert a batch of transformed records using Prisma transaction
   * @param pgClient PostgreSQL Prisma client
   * @param tableName Target table name
   * @param records Transformed records
   * @returns Number of successfully inserted records
   */
  private async insertBatch(
    pgClient: any,
    tableName: string,
    records: any[]
  ): Promise<number> {
    try {
      // Use Prisma transaction to ensure atomicity
      const result = await pgClient.$transaction(async (tx: any) => {
        // Get the appropriate Prisma model delegate
        const model = this.getPrismaModel(tx, tableName);

        if (!model) {
          throw new Error(`No Prisma model found for table: ${tableName}`);
        }

        // Use createMany for batch insert
        const createResult = await model.createMany({
          data: records,
          skipDuplicates: true, // Skip records with unique constraint violations
        });

        return createResult.count;
      });

      return result;
    } catch (error: any) {
      console.error(`Failed to insert batch for table ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get Prisma model delegate for a given table name
   * @param prismaClient Prisma client or transaction
   * @param tableName Table name
   * @returns Prisma model delegate
   */
  private getPrismaModel(prismaClient: any, tableName: string): any {
    // Map table names to Prisma model names
    const modelMap: Record<string, string> = {
      'Users': 'users',
      'crm_Accounts': 'crm_Accounts',
      'crm_Contacts': 'crm_Contacts',
      'crm_Leads': 'crm_Leads',
      'crm_Opportunities': 'crm_Opportunities',
      'crm_Contracts': 'crm_Contracts',
      'crm_campaigns': 'crm_campaigns',
      'crm_Opportunities_Sales_Stages': 'crm_Opportunities_Sales_Stages',
      'crm_Opportunities_Type': 'crm_Opportunities_Type',
      'crm_Industry_Type': 'crm_Industry_Type',
      'Tasks': 'tasks',
      'crm_Accounts_Tasks': 'crm_Accounts_Tasks',
      'tasksComments': 'tasksComments',
      'Sections': 'sections',
      'Boards': 'boards',
      'Documents': 'documents',
      'Documents_Types': 'documents_Types',
      'Invoices': 'invoices',
      'invoice_States': 'invoice_States',
      'system_Modules_Enabled': 'system_Modules_Enabled',
      'modulStatus': 'modulStatus',
      'systemServices': 'systemServices',
      'MyAccount': 'myAccount',
      'Employees': 'employees',
      'ImageUpload': 'imageUpload',
      'TodoList': 'todoList',
      'gpt_models': 'gpt_models',
      'secondBrain_notions': 'secondBrain_notions',
      'openAi_keys': 'openAi_keys',
      // Junction tables
      'DocumentsToInvoices': 'documentsToInvoices',
      'DocumentsToOpportunities': 'documentsToOpportunities',
      'DocumentsToContacts': 'documentsToContacts',
      'DocumentsToTasks': 'documentsToTasks',
      'DocumentsToCrmAccountsTasks': 'documentsToCrmAccountsTasks',
      'DocumentsToLeads': 'documentsToLeads',
      'DocumentsToAccounts': 'documentsToAccounts',
      'ContactsToOpportunities': 'contactsToOpportunities',
      'AccountWatchers': 'accountWatchers',
      'BoardWatchers': 'boardWatchers',
    };

    const modelName = modelMap[tableName];
    if (!modelName) {
      console.warn(`No model mapping found for table: ${tableName}`);
      return null;
    }

    return prismaClient[modelName];
  }

  /**
   * Process records in batches
   * @param records All records to process
   * @param callback Function to call for each batch
   */
  async* processBatches<T>(records: T[]): AsyncGenerator<T[], void, unknown> {
    for (let i = 0; i < records.length; i += this.batchSize) {
      yield records.slice(i, i + this.batchSize);
    }
  }

  /**
   * Get batch size
   */
  getBatchSize(): number {
    return this.batchSize;
  }

  /**
   * Migrate junction table records in batches
   * @param pgClient PostgreSQL Prisma client
   * @param tableName Junction table name
   * @param junctionRecords Junction table records
   * @returns Number of successfully inserted records
   */
  async migrateJunctionBatch(
    pgClient: PrismaClientPG,
    tableName: string,
    junctionRecords: Array<Record<string, string>>
  ): Promise<number> {
    if (junctionRecords.length === 0) return 0;

    try {
      const result = await this.insertBatch(pgClient, tableName, junctionRecords);
      return result;
    } catch (error: any) {
      console.error(`Junction batch processing failed for table ${tableName}:`, error.message);
      this.errorLogger.logError(
        tableName,
        'junction-batch',
        error,
        { count: junctionRecords.length }
      );
      return 0;
    }
  }
}
