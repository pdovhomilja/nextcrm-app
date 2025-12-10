/**
 * TypeScript interfaces for migration validation
 * Implements 4-layer validation: row counts, sample records, referential integrity, data types
 */

/**
 * Overall validation report structure
 */
export interface ValidationReport {
  /** Timestamp of validation */
  timestamp: string;
  /** Overall validation status (PASS or FAIL) */
  overallStatus: 'PASS' | 'FAIL';
  /** Summary statistics */
  summary: ValidationSummary;
  /** Layer 1: Row count validation results */
  rowCountValidation: RowCountValidationResult;
  /** Layer 2: Sample record validation results */
  sampleRecordValidation: SampleRecordValidationResult;
  /** Layer 3: Referential integrity validation results */
  referentialIntegrityValidation: ReferentialIntegrityValidationResult;
  /** Layer 4: Data type validation results */
  dataTypeValidation: DataTypeValidationResult;
  /** Detailed results per table */
  detailedResults: TableValidationResult[];
}

/**
 * Summary statistics for the validation report
 */
export interface ValidationSummary {
  /** Total tables validated */
  totalTables: number;
  /** Number of tables validated */
  tablesValidated: number;
  /** Number of tables that passed */
  tablesPassed: number;
  /** Number of tables that failed */
  tablesFailed: number;
  /** Total records in MongoDB */
  totalRecords: number;
  /** Number of records validated (sample) */
  recordsValidated: number;
  /** Number of records that matched */
  recordsMatched: number;
  /** Number of records that mismatched */
  recordsMismatched: number;
  /** Overall match percentage */
  matchPercentage: number;
}

/**
 * Layer 1: Row count validation results
 */
export interface RowCountValidationResult {
  /** Validation status */
  status: 'PASS' | 'FAIL';
  /** List of row count discrepancies */
  discrepancies: RowCountDiscrepancy[];
}

/**
 * Row count discrepancy for a specific table
 */
export interface RowCountDiscrepancy {
  /** Table name */
  tableName: string;
  /** Count in MongoDB */
  mongoCount: number;
  /** Count in PostgreSQL */
  postgresCount: number;
  /** Difference */
  difference: number;
}

/**
 * Layer 2: Sample record validation results
 */
export interface SampleRecordValidationResult {
  /** Validation status */
  status: 'PASS' | 'FAIL';
  /** List of field mismatches */
  fieldMismatches: FieldMismatch[];
  /** Overall match percentage */
  matchPercentage: number;
}

/**
 * Field mismatch between MongoDB and PostgreSQL
 */
export interface FieldMismatch {
  /** Table name */
  tableName: string;
  /** MongoDB ObjectId */
  mongoId: string;
  /** PostgreSQL UUID */
  postgresUuid: string;
  /** Field name */
  fieldName: string;
  /** Expected value (MongoDB) */
  expectedValue: unknown;
  /** Actual value (PostgreSQL) */
  actualValue: unknown;
  /** Mismatch type */
  mismatchType: 'VALUE' | 'TYPE' | 'MISSING' | 'NULL';
}

/**
 * Layer 3: Referential integrity validation results
 */
export interface ReferentialIntegrityValidationResult {
  /** Validation status */
  status: 'PASS' | 'FAIL';
  /** List of orphaned records */
  orphanedRecords: OrphanedRecord[];
  /** List of broken foreign keys */
  brokenForeignKeys: BrokenForeignKey[];
}

/**
 * Orphaned record with missing foreign key reference
 */
export interface OrphanedRecord {
  /** Table name */
  tableName: string;
  /** Record UUID */
  recordUuid: string;
  /** Foreign key field name */
  foreignKeyField: string;
  /** Foreign key value that doesn't exist */
  foreignKeyValue: string;
  /** Referenced table name */
  referencedTable: string;
}

/**
 * Broken foreign key constraint
 */
export interface BrokenForeignKey {
  /** Table name */
  tableName: string;
  /** Foreign key field name */
  foreignKeyField: string;
  /** Referenced table name */
  referencedTable: string;
  /** Number of orphaned records */
  orphanedCount: number;
}

/**
 * Layer 4: Data type validation results
 */
export interface DataTypeValidationResult {
  /** Validation status */
  status: 'PASS' | 'FAIL';
  /** List of type errors */
  typeErrors: TypeValidationError[];
}

/**
 * Data type validation error
 */
export interface TypeValidationError {
  /** Table name */
  tableName: string;
  /** Record UUID */
  recordUuid: string;
  /** Field name */
  fieldName: string;
  /** Expected type */
  expectedType: string;
  /** Actual value */
  actualValue: unknown;
  /** Error message */
  errorMessage: string;
}

/**
 * Per-table validation result
 */
export interface TableValidationResult {
  /** Table name */
  tableName: string;
  /** Row count validation */
  rowCount: {
    /** MongoDB count */
    mongoCount: number;
    /** PostgreSQL count */
    postgresCount: number;
    /** Counts match */
    match: boolean;
  };
  /** Sample validation */
  sampleValidation: {
    /** Sample size */
    sampleSize: number;
    /** Number of matched records */
    matched: number;
    /** Number of mismatched records */
    mismatched: number;
    /** Match percentage */
    matchPercentage: number;
  };
  /** Foreign key validation */
  foreignKeyValidation: {
    /** Total foreign keys checked */
    totalForeignKeys: number;
    /** Valid foreign keys */
    validForeignKeys: number;
    /** Orphaned records count */
    orphanedRecordsCount: number;
  };
  /** Overall table status */
  status: 'PASS' | 'FAIL';
}

/**
 * Sample record for comparison
 */
export interface SampleRecord {
  /** MongoDB ObjectId */
  mongoId: string;
  /** PostgreSQL UUID */
  postgresUuid: string;
  /** MongoDB record data */
  mongoData: Record<string, unknown>;
  /** PostgreSQL record data */
  postgresData: Record<string, unknown>;
}

/**
 * Field comparison result
 */
export interface FieldComparisonResult {
  /** Field name */
  fieldName: string;
  /** Values match */
  match: boolean;
  /** Expected value */
  expectedValue: unknown;
  /** Actual value */
  actualValue: unknown;
  /** Mismatch reason (if not matched) */
  mismatchReason?: string;
}
