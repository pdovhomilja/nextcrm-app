#!/usr/bin/env ts-node
/**
 * Main MongoDB to PostgreSQL Migration Script
 * Entry point for the migration process
 *
 * Usage:
 *   npm run migrate:mongo-to-postgres
 *   npm run migrate:mongo-to-postgres -- --resume
 *   npm run migrate:mongo-to-postgres -- --clean
 */

import { MongoClient } from 'mongodb';
import { PrismaClient as PrismaClientPG } from '@prisma/client';
import { CheckpointManager } from './migration/checkpoint-manager';
import { ProgressTracker } from './migration/progress-tracker';
import { ErrorLogger } from './migration/error-logger';
import { UuidMapper } from './migration/uuid-mapper';
import { MigrationOrchestrator } from './migration/orchestrator';
import { formatDuration, formatNumber } from './migration/utils';
import * as path from 'path';
import * as process from 'process';

// Parse command line arguments
const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');
const shouldResume = args.includes('--resume') || !shouldClean;

// File paths
const CHECKPOINT_FILE = path.join(process.cwd(), 'migration-checkpoint.json');
const ERROR_LOG_FILE = path.join(process.cwd(), 'migration-errors.log');

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NextCRM MongoDB → PostgreSQL Migration');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Initialize MongoDB client
  console.log('🔌 Connecting to databases...');
  const mongoUrl = process.env.DATABASE_URL_MONGO || process.env.DATABASE_URL;
  if (!mongoUrl) {
    throw new Error('MongoDB connection URL not found. Please set DATABASE_URL_MONGO or DATABASE_URL');
  }

  const mongoClient = new MongoClient(mongoUrl);

  // Initialize PostgreSQL client
  const pgClient = new PrismaClientPG({
    datasources: {
      db: {
        url: process.env.DATABASE_URL_POSTGRES || process.env.DATABASE_URL,
      },
    },
  });

  try {
    // Connect to databases
    await mongoClient.connect();
    console.log('   ✅ MongoDB connected');

    await pgClient.$connect();
    console.log('   ✅ PostgreSQL connected\n');

    // Initialize migration components
    const checkpointManager = new CheckpointManager(CHECKPOINT_FILE);
    const progressTracker = new ProgressTracker();
    const errorLogger = new ErrorLogger(ERROR_LOG_FILE);
    const uuidMapper = new UuidMapper();

    // Handle clean start
    if (shouldClean) {
      console.log('🧹 Cleaning previous migration state...\n');
      await checkpointManager.deleteCheckpoint();
      await errorLogger.clearErrorLog();
    }

    // Load checkpoint if resuming
    if (shouldResume) {
      const checkpoint = await checkpointManager.loadCheckpoint();
      if (checkpoint) {
        console.log('📊 Resuming from previous checkpoint');
        console.log(`   Completed tables: ${checkpoint.completedTables.length}`);
        console.log(`   Current table: ${checkpoint.currentTable || 'junction tables'}`);
        console.log(`   Records migrated: ${formatNumber(checkpoint.totalRecordsMigrated)}`);
        console.log(`   Errors: ${checkpoint.totalErrors}\n`);

        // Restore UUID mapping
        uuidMapper.restoreMapping(checkpoint.objectIdToUuidMap);
      }
    }

    // Set up graceful shutdown
    setupGracefulShutdown(checkpointManager, mongoClient, pgClient);

    // Create orchestrator
    const orchestrator = new MigrationOrchestrator(
      mongoClient,
      pgClient,
      checkpointManager,
      progressTracker,
      errorLogger,
      uuidMapper
    );

    // Run migration
    const summary = await orchestrator.runMigration();

    // Display summary
    displayMigrationSummary(summary);

    // Exit successfully
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);

    console.log('\n💾 Progress has been saved to checkpoint file');
    console.log('   You can resume the migration by running the script again');

    process.exit(1);
  } finally {
    // Disconnect clients
    await mongoClient.close();
    await pgClient.$disconnect();
  }
}

/**
 * Set up graceful shutdown on SIGINT (Ctrl+C)
 */
function setupGracefulShutdown(
  checkpointManager: CheckpointManager,
  mongoClient: MongoClient,
  pgClient: PrismaClientPG
) {
  process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Interrupt received, saving checkpoint...');

    try {
      await checkpointManager.saveCurrentProgress();
      console.log('✅ Checkpoint saved successfully');
      console.log('   You can resume the migration by running the script again\n');
    } catch (error: any) {
      console.error('❌ Failed to save checkpoint:', error.message);
    }

    // Disconnect and exit
    await mongoClient.close();
    await pgClient.$disconnect();
    process.exit(0);
  });
}

/**
 * Display migration summary
 */
function displayMigrationSummary(summary: any) {
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('   Migration Summary');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`⏱️  Duration: ${formatDuration(summary.duration)}`);
  console.log(`📊 Total Records Migrated: ${formatNumber(summary.totalRecordsMigrated)}`);
  console.log(`⚡ Speed: ${formatNumber(summary.recordsPerSecond)} records/second`);
  console.log(`✅ Success Rate: ${summary.successRate.toFixed(2)}%`);

  if (summary.totalErrors > 0) {
    console.log(`\n⚠️  Errors: ${summary.totalErrors}`);
    console.log(`   See ${ERROR_LOG_FILE} for details`);
  }

  console.log('\n--- Per-Table Statistics ---\n');

  summary.tableStats.forEach((stat: any) => {
    const duration = formatDuration(stat.duration || 0);
    const rate = stat.recordsPerSecond || 0;
    console.log(`  ${stat.tableName}:`);
    console.log(`    Records: ${formatNumber(stat.migratedRecords)}/${formatNumber(stat.totalRecords)}`);
    console.log(`    Duration: ${duration} (${formatNumber(rate)} rec/s)`);
    if (stat.failedRecords > 0) {
      console.log(`    Failed: ${stat.failedRecords}`);
    }
  });

  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('✅ Migration completed successfully!');
  console.log('   You can now update DATABASE_URL to point to PostgreSQL\n');
}

// Run migration
main();
