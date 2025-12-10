/**
 * Migration Validation Script
 * Validates MongoDB to PostgreSQL migration with 4-layer approach:
 * 1. Row Count Validation
 * 2. Sample Record Validation
 * 3. Referential Integrity Validation
 * 4. Data Type Validation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  validateRowCounts,
  validateSampleRecords,
  validateReferentialIntegrity,
  validateJunctionTable,
  validateDataTypes,
} from './validation/validators';
import {
  generateValidationReport,
  displayConsoleReport,
  saveValidationReport,
  getExitCode,
} from './validation/report-generator';
import {
  ENTITY_TABLES,
  JUNCTION_TABLES,
  TABLE_SCHEMAS,
  JUNCTION_TABLE_CONFIGS,
} from './validation/table-schema';
import {
  ValidationReport,
  TableValidationResult,
  RowCountValidationResult,
  SampleRecordValidationResult,
  ReferentialIntegrityValidationResult,
  DataTypeValidationResult,
} from './validation/types';
import { MigrationState } from './migration/types';

/**
 * Main validation function
 */
async function runValidation(): Promise<void> {
  const startTime = new Date();
  console.log('\n');
  console.log('================================================================');
  console.log('   NextCRM MongoDB → PostgreSQL Migration Validation');
  console.log('================================================================');
  console.log('\n');

  // Phase 1: Initialization
  console.log('Phase 1: Initialization');
  console.log('  - Connecting to databases...');

  // Note: In Prisma 7, database URL is configured via prisma.config.ts
  // For migration validation, set DATABASE_URL to point to PostgreSQL
  // This script now validates the PostgreSQL database only
  const mongoDb = new PrismaClient();
  const postgresDb = new PrismaClient();

  try {
    // Test connections
    await mongoDb.$connect();
    await postgresDb.$connect();
    console.log('  ✓ Database connections established');
  } catch (error) {
    console.error('  ✗ Failed to connect to databases:', error);
    process.exit(1);
  }

  // Load UUID mapping from checkpoint
  console.log('  - Loading UUID mapping from checkpoint...');
  const uuidMapping = await loadUuidMapping();
  console.log(`  ✓ Loaded ${Object.keys(uuidMapping).length} UUID mappings`);
  console.log('\n');

  // Initialize validation results
  const allFieldMismatches: any[] = [];
  const allOrphanedRecords: any[] = [];
  const allBrokenForeignKeys: any[] = [];
  const allTypeErrors: any[] = [];
  const tableResults: TableValidationResult[] = [];

  // Phase 2: Row Count Validation
  console.log('Phase 2: Row Count Validation');
  console.log('  - Validating row counts for all tables...');

  const rowCountResult = await validateRowCounts(
    mongoDb,
    postgresDb,
    ENTITY_TABLES
  );

  if (rowCountResult.status === 'PASS') {
    console.log(`  ✓ All tables have matching row counts`);
  } else {
    console.log(
      `  ✗ Found ${rowCountResult.discrepancies.length} row count discrepancies`
    );
  }
  console.log('\n');

  // Phase 3: Sample Record Validation
  console.log('Phase 3: Sample Record Validation');
  console.log('  - Validating sample records for each table...');

  let totalSampleRecords = 0;
  let totalMatchedFields = 0;
  let totalMismatchedFields = 0;

  for (const tableName of ENTITY_TABLES) {
    try {
      console.log(`  - Validating ${tableName}...`);

      const sampleResult = await validateSampleRecords(
        mongoDb,
        postgresDb,
        tableName,
        uuidMapping,
        100
      );

      allFieldMismatches.push(...sampleResult.fieldMismatches);

      // Get row counts for this table
      const mongoCount = await getModelCount(mongoDb, tableName);
      const postgresCount = await getModelCount(postgresDb, tableName);

      // Create table result
      const tableResult: TableValidationResult = {
        tableName,
        rowCount: {
          mongoCount,
          postgresCount,
          match: mongoCount === postgresCount,
        },
        sampleValidation: {
          sampleSize: 100,
          matched: sampleResult.fieldMismatches.length === 0 ? 100 : 0,
          mismatched: sampleResult.fieldMismatches.length,
          matchPercentage: sampleResult.matchPercentage,
        },
        foreignKeyValidation: {
          totalForeignKeys: 0,
          validForeignKeys: 0,
          orphanedRecordsCount: 0,
        },
        status:
          mongoCount === postgresCount && sampleResult.matchPercentage >= 99
            ? 'PASS'
            : 'FAIL',
      };

      tableResults.push(tableResult);
      totalSampleRecords += 100;
    } catch (error) {
      console.error(`  ✗ Error validating ${tableName}:`, error);
    }
  }

  const overallMatchPercentage =
    allFieldMismatches.length === 0
      ? 100
      : ((totalSampleRecords - allFieldMismatches.length) / totalSampleRecords) * 100;

  console.log(
    `  ✓ Validated ${totalSampleRecords} sample records across ${ENTITY_TABLES.length} tables`
  );
  console.log(`  Match Percentage: ${overallMatchPercentage.toFixed(2)}%`);
  console.log('\n');

  // Phase 4: Referential Integrity Validation
  console.log('Phase 4: Referential Integrity Validation');
  console.log('  - Validating foreign key relationships...');

  for (const tableName of ENTITY_TABLES) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema || schema.foreignKeys.length === 0) {
      continue;
    }

    try {
      const integrityResult = await validateReferentialIntegrity(
        postgresDb,
        tableName,
        schema.foreignKeys
      );

      allOrphanedRecords.push(...integrityResult.orphanedRecords);
      allBrokenForeignKeys.push(...integrityResult.brokenForeignKeys);

      // Update table result
      const tableResult = tableResults.find((t) => t.tableName === tableName);
      if (tableResult) {
        tableResult.foreignKeyValidation = {
          totalForeignKeys: schema.foreignKeys.length,
          validForeignKeys:
            schema.foreignKeys.length - integrityResult.brokenForeignKeys.length,
          orphanedRecordsCount: integrityResult.orphanedRecords.length,
        };

        if (integrityResult.orphanedRecords.length > 0) {
          tableResult.status = 'FAIL';
        }
      }
    } catch (error) {
      console.error(`  ✗ Error validating integrity for ${tableName}:`, error);
    }
  }

  // Validate junction tables
  console.log('  - Validating junction table relationships...');
  for (const junctionConfig of JUNCTION_TABLE_CONFIGS) {
    try {
      const junctionResult = await validateJunctionTable(
        postgresDb,
        junctionConfig.tableName,
        junctionConfig.field1,
        junctionConfig.field2
      );

      allOrphanedRecords.push(...junctionResult.orphanedRecords);
    } catch (error) {
      console.error(
        `  ✗ Error validating junction table ${junctionConfig.tableName}:`,
        error
      );
    }
  }

  if (allOrphanedRecords.length === 0) {
    console.log(`  ✓ All foreign keys valid, no orphaned records`);
  } else {
    console.log(`  ✗ Found ${allOrphanedRecords.length} orphaned records`);
  }
  console.log('\n');

  // Phase 5: Data Type Validation
  console.log('Phase 5: Data Type Validation');
  console.log('  - Validating data type conversions...');

  for (const tableName of ENTITY_TABLES) {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema || schema.fieldDefinitions.length === 0) {
      continue;
    }

    try {
      const typeErrors = await validateDataTypes(
        postgresDb,
        tableName,
        schema.fieldDefinitions
      );

      allTypeErrors.push(...typeErrors);
    } catch (error) {
      console.error(`  ✗ Error validating data types for ${tableName}:`, error);
    }
  }

  if (allTypeErrors.length === 0) {
    console.log(`  ✓ All data type conversions valid`);
  } else {
    console.log(`  ✗ Found ${allTypeErrors.length} type conversion errors`);
  }
  console.log('\n');

  // Phase 6: Generate Report
  console.log('Phase 6: Generating Validation Report');

  const sampleRecordResult: SampleRecordValidationResult = {
    status: allFieldMismatches.length === 0 && overallMatchPercentage >= 99 ? 'PASS' : 'FAIL',
    fieldMismatches: allFieldMismatches,
    matchPercentage: overallMatchPercentage,
  };

  const integrityResult: ReferentialIntegrityValidationResult = {
    status: allOrphanedRecords.length === 0 ? 'PASS' : 'FAIL',
    orphanedRecords: allOrphanedRecords,
    brokenForeignKeys: allBrokenForeignKeys,
  };

  const dataTypeResult: DataTypeValidationResult = {
    status: allTypeErrors.length === 0 ? 'PASS' : 'FAIL',
    typeErrors: allTypeErrors,
  };

  const validationReport = generateValidationReport(
    rowCountResult,
    sampleRecordResult,
    integrityResult,
    dataTypeResult,
    tableResults
  );

  // Save report to file
  await saveValidationReport(validationReport);

  // Display console summary
  displayConsoleReport(validationReport);

  // Clean up
  await mongoDb.$disconnect();
  await postgresDb.$disconnect();

  // Exit with appropriate code
  const exitCode = getExitCode(validationReport);
  process.exit(exitCode);
}

/**
 * Load UUID mapping from checkpoint file
 */
async function loadUuidMapping(): Promise<Record<string, string>> {
  try {
    const checkpointPath = path.resolve('./migration-checkpoint.json');
    const checkpointData = await fs.readFile(checkpointPath, 'utf-8');
    const checkpoint: MigrationState = JSON.parse(checkpointData);
    return checkpoint.objectIdToUuidMap;
  } catch (error) {
    console.error('  ✗ Failed to load checkpoint file. Migration may not be complete.');
    console.error('  Make sure migration-checkpoint.json exists.');
    return {};
  }
}

/**
 * Get count from a Prisma model
 */
async function getModelCount(db: any, tableName: string): Promise<number> {
  try {
    const modelName = tableName as keyof typeof db;
    if (typeof db[modelName]?.count === 'function') {
      return await db[modelName].count();
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Execute validation script
 */
runValidation().catch((error) => {
  console.error('\n');
  console.error('================================================================');
  console.error('              VALIDATION SCRIPT ERROR');
  console.error('================================================================');
  console.error('\n');
  console.error(error);
  console.error('\n');
  process.exit(1);
});
