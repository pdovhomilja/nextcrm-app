/**
 * Migration Orchestrator
 * Main migration loop that coordinates the entire migration process
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { PrismaClient as PrismaClientPG } from '@prisma/client';
import { CheckpointManager } from './checkpoint-manager';
import { ProgressTracker } from './progress-tracker';
import { ErrorLogger } from './error-logger';
import { UuidMapper } from './uuid-mapper';
import { BatchProcessor } from './batch-processor';
import {
  DEFAULT_MIGRATION_CONFIG,
  getAllTableNames,
  isJunctionTable,
  getTotalPhases,
  TABLE_MIGRATION_PHASES,
} from './table-config';
import { getTransformer } from './transformers';
import { MigrationSummary, TableMigrationStats, JunctionTableRecord } from './types';
import {
  extractDocumentRelationships,
  extractAccountWatchers,
  extractBoardWatchers,
  extractContactsToOpportunities,
  junctionRecordToPrisma,
} from './junction-populator';

export class MigrationOrchestrator {
  private mongoClient: MongoClient;
  private mongoDb: Db;
  private pgClient: PrismaClientPG;
  private checkpointManager: CheckpointManager;
  private progressTracker: ProgressTracker;
  private errorLogger: ErrorLogger;
  private uuidMapper: UuidMapper;
  private batchProcessor: BatchProcessor;
  private startTime: Date;
  private tableStats: Map<string, TableMigrationStats>;

  constructor(
    mongoClient: MongoClient,
    pgClient: PrismaClientPG,
    checkpointManager: CheckpointManager,
    progressTracker: ProgressTracker,
    errorLogger: ErrorLogger,
    uuidMapper: UuidMapper
  ) {
    this.mongoClient = mongoClient;
    // Get the database name from the connection string or default to 'nextcrm-demo'
    const dbName = this.extractDbName(mongoClient) || 'nextcrm-demo';
    this.mongoDb = mongoClient.db(dbName);
    this.pgClient = pgClient;
    this.checkpointManager = checkpointManager;
    this.progressTracker = progressTracker;
    this.errorLogger = errorLogger;
    this.uuidMapper = uuidMapper;
    this.batchProcessor = new BatchProcessor(
      DEFAULT_MIGRATION_CONFIG.batchSize,
      errorLogger
    );
    this.startTime = new Date();
    this.tableStats = new Map();
  }

  /**
   * Extract database name from MongoDB connection
   */
  private extractDbName(mongoClient: MongoClient): string | undefined {
    try {
      // Try to get the database name from the client options
      const options = (mongoClient as any).options;
      if (options && options.dbName) {
        return options.dbName;
      }
      // If not available, we'll use the default
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Run the complete migration
   */
  async runMigration(): Promise<MigrationSummary> {
    console.log('🚀 Starting MongoDB → PostgreSQL Migration\n');

    try {
      // Step 1: Pre-migration validation
      await this.validatePreMigration();

      // Step 2: Initialize checkpoint
      const checkpoint = await this.checkpointManager.loadCheckpoint();
      if (checkpoint) {
        console.log(`📊 Resuming from checkpoint: ${checkpoint.currentTable || 'junction tables'}`);
        console.log(`   Already migrated: ${checkpoint.totalRecordsMigrated} records\n`);
      }

      // Step 3: Migrate entity tables
      await this.migrateEntityTables();

      // Step 4: Populate junction tables
      await this.populateJunctionTables();

      // Step 5: Generate summary
      const summary = this.generateMigrationSummary();

      // Step 6: Clean up checkpoint
      await this.checkpointManager.deleteCheckpoint();

      console.log('\n🎉 Migration completed successfully!');
      return summary;
    } catch (error: any) {
      console.error('\n❌ Migration failed:', error.message);
      console.error('Checkpoint saved. You can resume the migration later.');
      throw error;
    }
  }

  /**
   * Validate PostgreSQL database before migration
   */
  private async validatePreMigration(): Promise<void> {
    console.log('✅ Validating PostgreSQL database...');

    try {
      // Test connection
      await this.pgClient.$queryRaw`SELECT 1`;

      // Check if database is empty or confirm overwrite
      // Note: Skipping this check for now - assuming database is prepared
      console.log('   PostgreSQL connection successful\n');
    } catch (error: any) {
      throw new Error(`PostgreSQL validation failed: ${error.message}`);
    }
  }

  /**
   * Migrate all entity tables (non-junction tables)
   */
  private async migrateEntityTables(): Promise<void> {
    const checkpoint = await this.checkpointManager.getState();
    const phases = TABLE_MIGRATION_PHASES.filter(phase => phase.phase < 10); // Exclude junction tables

    console.log(`📋 Migrating ${phases.length} phases of entity tables...\n`);

    for (const phase of phases) {
      console.log(`\n--- Phase ${phase.phase}: ${phase.description} ---`);

      for (const tableName of phase.tables) {
        // Skip if already completed
        if (checkpoint.completedTables.includes(tableName)) {
          console.log(`✅ ${tableName} (already completed)`);
          continue;
        }

        await this.migrateTable(tableName);
      }
    }
  }

  /**
   * Migrate a single table
   */
  private async migrateTable(tableName: string): Promise<void> {
    const tableStartTime = new Date();
    console.log(`\n🔄 Migrating: ${tableName}`);

    try {
      // Get total record count from MongoDB
      const totalRecords = await this.getMongoRecordCount(tableName);
      console.log(`   Total records: ${totalRecords}`);

      if (totalRecords === 0) {
        console.log(`   Skipping empty table`);
        await this.markTableCompleted(tableName);
        return;
      }

      // Initialize table stats
      const stats: TableMigrationStats = {
        tableName,
        totalRecords,
        migratedRecords: 0,
        failedRecords: 0,
        startTime: tableStartTime,
      };

      // Get transformer function
      const transformer = getTransformer(tableName);

      // Process in batches
      let batchNumber = 0;
      let processedRecords = 0;

      while (processedRecords < totalRecords) {
        // Fetch batch from MongoDB
        const batch = await this.fetchMongoRecords(
          tableName,
          processedRecords,
          this.batchProcessor.getBatchSize()
        );

        if (batch.length === 0) break;

        // Migrate batch
        const migratedCount = await this.batchProcessor.migrateBatch(
          this.pgClient,
          tableName,
          batch,
          transformer,
          this.uuidMapper
        );

        processedRecords += batch.length;
        stats.migratedRecords += migratedCount;
        stats.failedRecords += batch.length - migratedCount;
        batchNumber++;

        // Update progress
        this.progressTracker.updateTableProgress(tableName, processedRecords, totalRecords);

        // Save checkpoint every N batches
        if (batchNumber % DEFAULT_MIGRATION_CONFIG.checkpointInterval === 0) {
          await this.checkpointManager.saveCurrentProgress(tableName, batchNumber);
        }
      }

      // Mark table as completed
      await this.markTableCompleted(tableName);

      // Finalize stats
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
      stats.recordsPerSecond = stats.duration > 0
        ? Math.round((stats.migratedRecords / stats.duration) * 1000)
        : 0;

      this.tableStats.set(tableName, stats);

      console.log(`✅ Completed: ${tableName} (${stats.migratedRecords}/${totalRecords} records, ${stats.duration}ms)`);
    } catch (error: any) {
      console.error(`❌ Failed to migrate table ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get MongoDB collection for a table
   */
  private getMongoCollection(tableName: string): Collection {
    return this.mongoDb.collection(tableName);
  }

  /**
   * Get record count from MongoDB table
   */
  private async getMongoRecordCount(tableName: string): Promise<number> {
    try {
      const collection = this.getMongoCollection(tableName);
      return await collection.countDocuments();
    } catch (error: any) {
      console.warn(`Failed to count records for ${tableName}:`, error.message);
      return 0;
    }
  }

  /**
   * Fetch records from MongoDB table
   */
  private async fetchMongoRecords(tableName: string, skip: number, take: number): Promise<any[]> {
    try {
      const collection = this.getMongoCollection(tableName);
      const cursor = collection.find({}).skip(skip).limit(take);
      return await cursor.toArray();
    } catch (error: any) {
      console.error(`Failed to fetch records for ${tableName}:`, error.message);
      return [];
    }
  }

  /**
   * Mark table as completed in checkpoint
   */
  private async markTableCompleted(tableName: string): Promise<void> {
    await this.checkpointManager.markTableCompleted(tableName);
  }

  /**
   * Populate junction tables
   */
  private async populateJunctionTables(): Promise<void> {
    console.log('\n\n--- Phase 10: Populating Junction Tables ---');

    // Extract and populate document relationships
    await this.populateDocumentJunctions();

    // Extract and populate watcher relationships
    await this.populateWatcherJunctions();

    // Extract and populate contacts-opportunities relationships
    await this.populateContactsOpportunitiesJunction();
  }

  /**
   * Populate document-related junction tables
   */
  private async populateDocumentJunctions(): Promise<void> {
    console.log('\n🔄 Populating document junction tables...');

    // Fetch all documents from MongoDB
    const collection = this.getMongoCollection('Documents');
    const documents = await collection.find({}).toArray();

    const junctionData: {
      invoices: JunctionTableRecord[];
      opportunities: JunctionTableRecord[];
      contacts: JunctionTableRecord[];
      tasks: JunctionTableRecord[];
      crmAccountsTasks: JunctionTableRecord[];
      leads: JunctionTableRecord[];
      accounts: JunctionTableRecord[];
    } = {
      invoices: [],
      opportunities: [],
      contacts: [],
      tasks: [],
      crmAccountsTasks: [],
      leads: [],
      accounts: [],
    };

    // Extract relationships
    for (const doc of documents) {
      const relations = extractDocumentRelationships(doc, this.uuidMapper);
      junctionData.invoices.push(...relations.invoices);
      junctionData.opportunities.push(...relations.opportunities);
      junctionData.contacts.push(...relations.contacts);
      junctionData.tasks.push(...relations.tasks);
      junctionData.crmAccountsTasks.push(...relations.crmAccountsTasks);
      junctionData.leads.push(...relations.leads);
      junctionData.accounts.push(...relations.accounts);
    }

    // Insert junction records
    await this.insertJunctionRecords('DocumentsToInvoices', junctionData.invoices);
    await this.insertJunctionRecords('DocumentsToOpportunities', junctionData.opportunities);
    await this.insertJunctionRecords('DocumentsToContacts', junctionData.contacts);
    await this.insertJunctionRecords('DocumentsToTasks', junctionData.tasks);
    await this.insertJunctionRecords('DocumentsToCrmAccountsTasks', junctionData.crmAccountsTasks);
    await this.insertJunctionRecords('DocumentsToLeads', junctionData.leads);
    await this.insertJunctionRecords('DocumentsToAccounts', junctionData.accounts);
  }

  /**
   * Populate watcher junction tables
   */
  private async populateWatcherJunctions(): Promise<void> {
    console.log('\n🔄 Populating watcher junction tables...');

    // Account watchers
    const accountsCollection = this.getMongoCollection('crm_Accounts');
    const accounts = await accountsCollection.find({}).toArray();
    const accountWatchers = accounts.flatMap(account =>
      extractAccountWatchers(account, this.uuidMapper)
    );
    await this.insertJunctionRecords('AccountWatchers', accountWatchers);

    // Board watchers
    const boardsCollection = this.getMongoCollection('Boards');
    const boards = await boardsCollection.find({}).toArray();
    const boardWatchers = boards.flatMap(board =>
      extractBoardWatchers(board, this.uuidMapper)
    );
    await this.insertJunctionRecords('BoardWatchers', boardWatchers);
  }

  /**
   * Populate contacts-opportunities junction table
   */
  private async populateContactsOpportunitiesJunction(): Promise<void> {
    console.log('\n🔄 Populating contacts-opportunities junction table...');

    const opportunitiesCollection = this.getMongoCollection('crm_Opportunities');
    const opportunities = await opportunitiesCollection.find({}).toArray();
    const contacts = opportunities.flatMap(opp =>
      extractContactsToOpportunities(opp, this.uuidMapper)
    );
    await this.insertJunctionRecords('ContactsToOpportunities', contacts);
  }

  /**
   * Insert junction records in batches
   */
  private async insertJunctionRecords(tableName: string, records: JunctionTableRecord[]): Promise<void> {
    if (records.length === 0) {
      console.log(`   ${tableName}: 0 records`);
      return;
    }

    console.log(`   ${tableName}: ${records.length} records`);

    const prismaRecords = records.map(junctionRecordToPrisma);
    let inserted = 0;

    for (let i = 0; i < prismaRecords.length; i += this.batchProcessor.getBatchSize()) {
      const batch = prismaRecords.slice(i, i + this.batchProcessor.getBatchSize());
      const count = await this.batchProcessor.migrateJunctionBatch(
        this.pgClient,
        tableName,
        batch
      );
      inserted += count;
    }

    console.log(`   ✅ Inserted ${inserted}/${records.length} records`);
  }

  /**
   * Generate migration summary
   */
  private generateMigrationSummary(): MigrationSummary {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    const tableStats = Array.from(this.tableStats.values());
    const totalRecordsMigrated = tableStats.reduce((sum, stat) => sum + stat.migratedRecords, 0);
    const totalErrors = this.errorLogger.getErrorCount();

    return {
      startTime: this.startTime,
      endTime,
      duration,
      totalRecordsMigrated,
      totalErrors,
      successRate: totalRecordsMigrated > 0
        ? ((totalRecordsMigrated - totalErrors) / totalRecordsMigrated) * 100
        : 0,
      recordsPerSecond: duration > 0 ? Math.round((totalRecordsMigrated / duration) * 1000) : 0,
      tableStats,
      errorSummary: this.errorLogger.generateErrorSummary(),
    };
  }
}
