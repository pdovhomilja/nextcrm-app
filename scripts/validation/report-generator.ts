/**
 * Validation report generation and console output
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ValidationReport,
  ValidationSummary,
  TableValidationResult,
  RowCountValidationResult,
  SampleRecordValidationResult,
  ReferentialIntegrityValidationResult,
  DataTypeValidationResult,
} from './types';

/**
 * ANSI color codes for console output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Generate comprehensive validation report
 */
export function generateValidationReport(
  rowCountResults: RowCountValidationResult,
  sampleRecordResults: SampleRecordValidationResult,
  integrityResults: ReferentialIntegrityValidationResult,
  dataTypeResults: DataTypeValidationResult,
  tableResults: TableValidationResult[]
): ValidationReport {
  // Calculate summary statistics
  const summary: ValidationSummary = {
    totalTables: tableResults.length,
    tablesValidated: tableResults.length,
    tablesPassed: tableResults.filter((t) => t.status === 'PASS').length,
    tablesFailed: tableResults.filter((t) => t.status === 'FAIL').length,
    totalRecords: tableResults.reduce((sum, t) => sum + t.rowCount.mongoCount, 0),
    recordsValidated: tableResults.reduce(
      (sum, t) => sum + t.sampleValidation.sampleSize,
      0
    ),
    recordsMatched: tableResults.reduce(
      (sum, t) => sum + t.sampleValidation.matched,
      0
    ),
    recordsMismatched: tableResults.reduce(
      (sum, t) => sum + t.sampleValidation.mismatched,
      0
    ),
    matchPercentage: sampleRecordResults.matchPercentage,
  };

  // Determine overall status
  const overallStatus =
    rowCountResults.status === 'PASS' &&
    sampleRecordResults.status === 'PASS' &&
    integrityResults.status === 'PASS' &&
    dataTypeResults.status === 'PASS'
      ? 'PASS'
      : 'FAIL';

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    overallStatus,
    summary,
    rowCountValidation: rowCountResults,
    sampleRecordValidation: sampleRecordResults,
    referentialIntegrityValidation: integrityResults,
    dataTypeValidation: dataTypeResults,
    detailedResults: tableResults,
  };

  return report;
}

/**
 * Display validation report summary to console
 */
export function displayConsoleReport(report: ValidationReport): void {
  console.log('\n');
  console.log(
    `${colors.bright}${colors.cyan}================================================================${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.cyan}         NextCRM Migration Validation Report${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.cyan}================================================================${colors.reset}`
  );
  console.log('\n');

  // Overall status
  const statusColor = report.overallStatus === 'PASS' ? colors.green : colors.red;
  console.log(
    `${colors.bright}Overall Status:${colors.reset} ${statusColor}${colors.bright}${report.overallStatus}${colors.reset}`
  );
  console.log('\n');

  // Summary statistics
  console.log(`${colors.bright}${colors.underscore}Summary Statistics:${colors.reset}`);
  console.log(`  Total Tables: ${report.summary.totalTables}`);
  console.log(`  Tables Validated: ${report.summary.tablesValidated}`);
  console.log(
    `  Tables Passed: ${colors.green}${report.summary.tablesPassed}${colors.reset}`
  );
  console.log(`  Tables Failed: ${colors.red}${report.summary.tablesFailed}${colors.reset}`);
  console.log(`  Total Records: ${report.summary.totalRecords.toLocaleString()}`);
  console.log(
    `  Records Validated: ${report.summary.recordsValidated.toLocaleString()}`
  );
  console.log(
    `  Match Percentage: ${colors.bright}${report.summary.matchPercentage.toFixed(2)}%${colors.reset}`
  );
  console.log('\n');

  // Layer 1: Row Count Validation
  console.log(`${colors.bright}${colors.underscore}Layer 1: Row Count Validation${colors.reset}`);
  const rowCountColor =
    report.rowCountValidation.status === 'PASS' ? colors.green : colors.red;
  console.log(`  Status: ${rowCountColor}${colors.bright}${report.rowCountValidation.status}${colors.reset}`);
  if (report.rowCountValidation.discrepancies.length > 0) {
    console.log(
      `  Discrepancies: ${colors.red}${report.rowCountValidation.discrepancies.length}${colors.reset}`
    );
    report.rowCountValidation.discrepancies.slice(0, 5).forEach((d) => {
      console.log(
        `    - ${d.tableName}: MongoDB=${d.mongoCount}, PostgreSQL=${d.postgresCount} (diff: ${d.difference})`
      );
    });
    if (report.rowCountValidation.discrepancies.length > 5) {
      console.log(
        `    ... and ${report.rowCountValidation.discrepancies.length - 5} more`
      );
    }
  } else {
    console.log(
      `  ${colors.green}✓${colors.reset} All ${report.summary.totalTables} tables have matching record counts`
    );
  }
  console.log('\n');

  // Layer 2: Sample Record Validation
  console.log(`${colors.bright}${colors.underscore}Layer 2: Sample Record Validation${colors.reset}`);
  const sampleColor =
    report.sampleRecordValidation.status === 'PASS' ? colors.green : colors.red;
  console.log(`  Status: ${sampleColor}${colors.bright}${report.sampleRecordValidation.status}${colors.reset}`);
  console.log(
    `  Records Validated: ${report.summary.recordsValidated.toLocaleString()}`
  );
  console.log(
    `  Match Percentage: ${colors.bright}${report.sampleRecordValidation.matchPercentage.toFixed(2)}%${colors.reset}`
  );
  if (report.sampleRecordValidation.fieldMismatches.length > 0) {
    console.log(
      `  Field Mismatches: ${colors.red}${report.sampleRecordValidation.fieldMismatches.length}${colors.reset}`
    );
    report.sampleRecordValidation.fieldMismatches.slice(0, 5).forEach((m) => {
      console.log(`    - ${m.tableName}.${m.fieldName} (Record: ${m.mongoId})`);
    });
    if (report.sampleRecordValidation.fieldMismatches.length > 5) {
      console.log(
        `    ... and ${report.sampleRecordValidation.fieldMismatches.length - 5} more`
      );
    }
  } else {
    console.log(`  ${colors.green}✓${colors.reset} 100% field-level match`);
  }
  console.log('\n');

  // Layer 3: Referential Integrity Validation
  console.log(`${colors.bright}${colors.underscore}Layer 3: Referential Integrity Validation${colors.reset}`);
  const integrityColor =
    report.referentialIntegrityValidation.status === 'PASS' ? colors.green : colors.red;
  console.log(
    `  Status: ${integrityColor}${colors.bright}${report.referentialIntegrityValidation.status}${colors.reset}`
  );
  if (report.referentialIntegrityValidation.orphanedRecords.length > 0) {
    console.log(
      `  Orphaned Records: ${colors.red}${report.referentialIntegrityValidation.orphanedRecords.length}${colors.reset}`
    );
    report.referentialIntegrityValidation.orphanedRecords.slice(0, 5).forEach((o) => {
      console.log(
        `    - ${o.tableName}.${o.foreignKeyField} -> ${o.referencedTable} (Record: ${o.recordUuid})`
      );
    });
    if (report.referentialIntegrityValidation.orphanedRecords.length > 5) {
      console.log(
        `    ... and ${report.referentialIntegrityValidation.orphanedRecords.length - 5} more`
      );
    }
  } else {
    console.log(`  ${colors.green}✓${colors.reset} All foreign keys resolve correctly`);
  }
  if (report.referentialIntegrityValidation.brokenForeignKeys.length > 0) {
    console.log(
      `  Broken Foreign Keys: ${colors.red}${report.referentialIntegrityValidation.brokenForeignKeys.length}${colors.reset}`
    );
    report.referentialIntegrityValidation.brokenForeignKeys.forEach((b) => {
      console.log(
        `    - ${b.tableName}.${b.foreignKeyField} -> ${b.referencedTable} (${b.orphanedCount} orphaned)`
      );
    });
  } else {
    console.log(`  ${colors.green}✓${colors.reset} No orphaned records found`);
  }
  console.log('\n');

  // Layer 4: Data Type Validation
  console.log(`${colors.bright}${colors.underscore}Layer 4: Data Type Validation${colors.reset}`);
  const dataTypeColor =
    report.dataTypeValidation.status === 'PASS' ? colors.green : colors.red;
  console.log(`  Status: ${dataTypeColor}${colors.bright}${report.dataTypeValidation.status}${colors.reset}`);
  if (report.dataTypeValidation.typeErrors.length > 0) {
    console.log(
      `  Type Errors: ${colors.red}${report.dataTypeValidation.typeErrors.length}${colors.reset}`
    );
    report.dataTypeValidation.typeErrors.slice(0, 5).forEach((e) => {
      console.log(
        `    - ${e.tableName}.${e.fieldName}: ${e.errorMessage} (Record: ${e.recordUuid})`
      );
    });
    if (report.dataTypeValidation.typeErrors.length > 5) {
      console.log(
        `    ... and ${report.dataTypeValidation.typeErrors.length - 5} more`
      );
    }
  } else {
    console.log(`  ${colors.green}✓${colors.reset} All data type conversions valid`);
  }
  console.log('\n');

  // Final message
  console.log(
    `${colors.bright}${colors.cyan}================================================================${colors.reset}`
  );
  if (report.overallStatus === 'PASS') {
    console.log(`${colors.bright}${colors.green}             🎉 VALIDATION PASSED 🎉${colors.reset}`);
    console.log('\n');
    console.log(
      `${colors.green}✓ Safe to update DATABASE_URL and deploy to production!${colors.reset}`
    );
  } else {
    console.log(`${colors.bright}${colors.red}             ❌ VALIDATION FAILED ❌${colors.reset}`);
    console.log('\n');
    console.log(
      `${colors.red}⚠ Review validation report before proceeding to production.${colors.reset}`
    );
    console.log(
      `${colors.yellow}  See migration-validation-report.json for detailed information.${colors.reset}`
    );
  }
  console.log(
    `${colors.bright}${colors.cyan}================================================================${colors.reset}`
  );
  console.log('\n');
}

/**
 * Save validation report to JSON file
 */
export async function saveValidationReport(
  report: ValidationReport,
  outputPath: string = './migration-validation-report.json'
): Promise<void> {
  try {
    const absolutePath = path.resolve(outputPath);
    const reportJson = JSON.stringify(report, null, 2);
    await fs.writeFile(absolutePath, reportJson, 'utf-8');
    console.log(`Validation report saved to: ${absolutePath}`);
  } catch (error) {
    console.error('Error saving validation report:', error);
    throw error;
  }
}

/**
 * Get exit code based on validation status
 */
export function getExitCode(report: ValidationReport): number {
  return report.overallStatus === 'PASS' ? 0 : 1;
}
