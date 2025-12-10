/**
 * TypeScript interfaces for MongoDB to PostgreSQL migration
 * Supports checkpoint/resume, error logging, and progress tracking
 */

import { Document as MongoDocument, ObjectId } from 'mongodb';

/**
 * Complete migration state for checkpoint persistence
 */
export interface MigrationState {
  /** Checkpoint format version for compatibility */
  version: string;
  /** Timestamp when checkpoint was created */
  timestamp: string;
  /** Current table being processed (null if migration complete) */
  currentTable: string | null;
  /** List of tables that have been fully migrated */
  completedTables: string[];
  /** ObjectId to UUID mapping for all migrated records */
  objectIdToUuidMap: Record<string, string>;
  /** UUIDs of successfully migrated records by table */
  migratedRecords: Record<string, string[]>;
  /** Total number of records migrated across all tables */
  totalRecordsMigrated: number;
  /** Total number of errors encountered */
  totalErrors: number;
  /** Current batch number being processed */
  currentBatch?: number;
}

/**
 * Migration configuration
 */
export interface MigrationConfig {
  /** Number of records to process per batch */
  batchSize: number;
  /** Order in which tables should be migrated (respects dependencies) */
  tableOrder: TableMigrationPhase[];
  /** Save checkpoint every N batches */
  checkpointInterval: number;
}

/**
 * Table migration phase with dependency information
 */
export interface TableMigrationPhase {
  /** Phase number for ordering */
  phase: number;
  /** Phase description */
  description: string;
  /** List of table names in this phase */
  tables: string[];
}

/**
 * Statistics for a single table migration
 */
export interface TableMigrationStats {
  /** Table name */
  tableName: string;
  /** Total records in MongoDB */
  totalRecords: number;
  /** Successfully migrated records */
  migratedRecords: number;
  /** Failed records */
  failedRecords: number;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime?: Date;
  /** Duration in milliseconds */
  duration?: number;
  /** Records per second */
  recordsPerSecond?: number;
}

/**
 * Error information for failed record migration
 */
export interface MigrationError {
  /** Table name where error occurred */
  tableName: string;
  /** MongoDB ObjectId of the failed record */
  mongoId: string;
  /** PostgreSQL UUID (if generated before failure) */
  uuid?: string;
  /** Error message */
  errorMessage: string;
  /** Full error stack trace */
  errorStack?: string;
  /** Original MongoDB document (for debugging) */
  originalDocument: unknown;
  /** Timestamp when error occurred */
  timestamp: string;
  /** Batch number where error occurred */
  batchNumber?: number;
}

/**
 * Error summary for reporting
 */
export interface ErrorSummary {
  /** Total errors across all tables */
  totalErrors: number;
  /** Errors grouped by table */
  errorsByTable: Record<string, number>;
  /** List of all failed MongoDB ObjectIds */
  failedObjectIds: string[];
  /** Common error patterns */
  errorPatterns: Array<{
    pattern: string;
    count: number;
    example: string;
  }>;
}

/**
 * Overall migration summary report
 */
export interface MigrationSummary {
  /** Migration start time */
  startTime: Date;
  /** Migration end time */
  endTime: Date;
  /** Total duration in milliseconds */
  duration: number;
  /** Total records migrated */
  totalRecordsMigrated: number;
  /** Total errors */
  totalErrors: number;
  /** Success rate percentage */
  successRate: number;
  /** Records per second */
  recordsPerSecond: number;
  /** Per-table statistics */
  tableStats: TableMigrationStats[];
  /** Error summary */
  errorSummary: ErrorSummary;
}

/**
 * ObjectId to UUID mapping type
 */
export type ObjectIdUuidMapping = Map<string, string>;

/**
 * Progress information for console output
 */
export interface ProgressInfo {
  /** Current table being migrated */
  currentTable: string;
  /** Current phase number */
  currentPhase: number;
  /** Total phases */
  totalPhases: number;
  /** Records processed in current table */
  tableRecordsProcessed: number;
  /** Total records in current table */
  tableRecordsTotal: number;
  /** Overall records processed */
  overallRecordsProcessed: number;
  /** Overall records total (estimated) */
  overallRecordsTotal: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
  /** Current records per second */
  recordsPerSecond?: number;
}

/**
 * Junction table record for many-to-many relationships
 */
export interface JunctionTableRecord {
  /** First foreign key field name */
  field1Name: string;
  /** First foreign key UUID */
  field1Value: string;
  /** Second foreign key field name */
  field2Name: string;
  /** Second foreign key UUID */
  field2Value: string;
}

/**
 * MongoDB document type (re-export from mongodb package)
 */
export type { MongoDocument, ObjectId };
