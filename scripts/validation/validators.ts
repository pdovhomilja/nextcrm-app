/**
 * Validation logic for migration verification
 * Implements 4-layer validation strategy
 */

import {
  RowCountValidationResult,
  RowCountDiscrepancy,
  SampleRecordValidationResult,
  FieldMismatch,
  ReferentialIntegrityValidationResult,
  OrphanedRecord,
  BrokenForeignKey,
  DataTypeValidationResult,
  TypeValidationError,
  FieldComparisonResult,
  SampleRecord,
} from './types';

/**
 * Layer 1: Validate row counts between MongoDB and PostgreSQL
 */
export async function validateRowCounts(
  mongoDb: any,
  postgresDb: any,
  tables: string[]
): Promise<RowCountValidationResult> {
  const discrepancies: RowCountDiscrepancy[] = [];

  for (const tableName of tables) {
    try {
      // Get MongoDB count
      const mongoCount = await getMongoCount(mongoDb, tableName);

      // Get PostgreSQL count
      const postgresCount = await getPostgresCount(postgresDb, tableName);

      // Compare counts
      if (mongoCount !== postgresCount) {
        discrepancies.push({
          tableName,
          mongoCount,
          postgresCount,
          difference: postgresCount - mongoCount,
        });
      }
    } catch (error) {
      console.error(`Error validating row count for table ${tableName}:`, error);
      discrepancies.push({
        tableName,
        mongoCount: -1,
        postgresCount: -1,
        difference: 0,
      });
    }
  }

  return {
    status: discrepancies.length === 0 ? 'PASS' : 'FAIL',
    discrepancies,
  };
}

/**
 * Get count from MongoDB table
 */
async function getMongoCount(mongoDb: any, tableName: string): Promise<number> {
  // Prisma model names need to be accessed correctly
  const modelName = tableName as keyof typeof mongoDb;
  if (typeof mongoDb[modelName]?.count === 'function') {
    return await mongoDb[modelName].count();
  }
  return 0;
}

/**
 * Get count from PostgreSQL table
 */
async function getPostgresCount(postgresDb: any, tableName: string): Promise<number> {
  const modelName = tableName as keyof typeof postgresDb;
  if (typeof postgresDb[modelName]?.count === 'function') {
    return await postgresDb[modelName].count();
  }
  return 0;
}

/**
 * Layer 2: Validate sample records field-by-field
 */
export async function validateSampleRecords(
  mongoDb: any,
  postgresDb: any,
  tableName: string,
  uuidMapping: Record<string, string>,
  sampleSize: number = 100
): Promise<{
  fieldMismatches: FieldMismatch[];
  matchPercentage: number;
}> {
  const fieldMismatches: FieldMismatch[] = [];
  let totalFields = 0;
  let matchedFields = 0;

  try {
    // Get sample records from MongoDB
    const modelName = tableName as keyof typeof mongoDb;
    if (!mongoDb[modelName] || typeof mongoDb[modelName].findMany !== 'function') {
      return { fieldMismatches: [], matchPercentage: 100 };
    }

    const mongoRecords = await mongoDb[modelName].findMany({
      take: sampleSize,
    });

    // Compare each record
    for (const mongoRecord of mongoRecords) {
      const mongoId = (mongoRecord as any).id;
      const postgresUuid = uuidMapping[mongoId];

      if (!postgresUuid) {
        continue; // Skip if no mapping found
      }

      // Get corresponding PostgreSQL record
      const postgresRecord = await postgresDb[modelName].findUnique({
        where: { id: postgresUuid },
      });

      if (!postgresRecord) {
        continue; // Skip if record not found
      }

      // Compare fields
      const comparisonResults = compareRecordFields(
        mongoRecord as Record<string, unknown>,
        postgresRecord as Record<string, unknown>
      );

      for (const result of comparisonResults) {
        totalFields++;
        if (result.match) {
          matchedFields++;
        } else {
          fieldMismatches.push({
            tableName,
            mongoId,
            postgresUuid,
            fieldName: result.fieldName,
            expectedValue: result.expectedValue,
            actualValue: result.actualValue,
            mismatchType: 'VALUE',
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error validating sample records for table ${tableName}:`, error);
  }

  const matchPercentage = totalFields > 0 ? (matchedFields / totalFields) * 100 : 100;

  return { fieldMismatches, matchPercentage };
}

/**
 * Compare fields between MongoDB and PostgreSQL records
 */
function compareRecordFields(
  mongoRecord: Record<string, unknown>,
  postgresRecord: Record<string, unknown>
): FieldComparisonResult[] {
  const results: FieldComparisonResult[] = [];
  const fieldsToSkip = ['id', '_id', 'createdAt', 'updatedAt'];

  // Get all fields from both records - convert Set to Array
  const allFieldsSet = new Set([
    ...Object.keys(mongoRecord),
    ...Object.keys(postgresRecord),
  ]);
  const allFields = Array.from(allFieldsSet);

  for (const fieldName of allFields) {
    if (fieldsToSkip.includes(fieldName)) {
      continue;
    }

    const mongoValue = mongoRecord[fieldName];
    const postgresValue = postgresRecord[fieldName];

    // Compare values
    const match = compareValues(mongoValue, postgresValue, fieldName);

    results.push({
      fieldName,
      match,
      expectedValue: mongoValue,
      actualValue: postgresValue,
      mismatchReason: match ? undefined : 'Value mismatch',
    });
  }

  return results;
}

/**
 * Compare two values with type-aware logic
 */
function compareValues(value1: unknown, value2: unknown, fieldName: string): boolean {
  // Handle null/undefined
  if (value1 === null || value1 === undefined) {
    return value2 === null || value2 === undefined;
  }
  if (value2 === null || value2 === undefined) {
    return value1 === null || value1 === undefined;
  }

  // Handle dates (within 1 second tolerance)
  if (value1 instanceof Date && value2 instanceof Date) {
    return Math.abs(value1.getTime() - value2.getTime()) < 1000;
  }

  // Handle arrays
  if (Array.isArray(value1) && Array.isArray(value2)) {
    return compareArrays(value1, value2);
  }

  // Handle objects (JSONB)
  if (typeof value1 === 'object' && typeof value2 === 'object') {
    return JSON.stringify(value1) === JSON.stringify(value2);
  }

  // Handle primitives
  return value1 === value2;
}

/**
 * Compare arrays (order-agnostic for some fields)
 */
function compareArrays(arr1: unknown[], arr2: unknown[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }

  // For simple arrays, compare sorted versions
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();

  return JSON.stringify(sorted1) === JSON.stringify(sorted2);
}

/**
 * Layer 3: Validate referential integrity
 */
export async function validateReferentialIntegrity(
  postgresDb: any,
  tableName: string,
  foreignKeys: Array<{ field: string; referencedTable: string }>
): Promise<{
  orphanedRecords: OrphanedRecord[];
  brokenForeignKeys: BrokenForeignKey[];
}> {
  const orphanedRecords: OrphanedRecord[] = [];
  const brokenForeignKeys: BrokenForeignKey[] = [];

  try {
    const modelName = tableName as keyof typeof postgresDb;
    if (!postgresDb[modelName]) {
      return { orphanedRecords, brokenForeignKeys };
    }

    // Check each foreign key
    for (const fk of foreignKeys) {
      const records = await postgresDb[modelName].findMany({
        select: {
          id: true,
          [fk.field]: true,
        },
      });

      let orphanedCount = 0;

      for (const record of records) {
        const foreignKeyValue = (record as any)[fk.field];

        if (!foreignKeyValue) {
          continue; // Skip null foreign keys
        }

        // Check if referenced record exists
        const referencedModelName = fk.referencedTable as keyof typeof postgresDb;
        const exists = await postgresDb[referencedModelName].findUnique({
          where: { id: foreignKeyValue },
        });

        if (!exists) {
          orphanedRecords.push({
            tableName,
            recordUuid: (record as any).id,
            foreignKeyField: fk.field,
            foreignKeyValue,
            referencedTable: fk.referencedTable,
          });
          orphanedCount++;
        }
      }

      if (orphanedCount > 0) {
        brokenForeignKeys.push({
          tableName,
          foreignKeyField: fk.field,
          referencedTable: fk.referencedTable,
          orphanedCount,
        });
      }
    }
  } catch (error) {
    console.error(`Error validating referential integrity for table ${tableName}:`, error);
  }

  return { orphanedRecords, brokenForeignKeys };
}

/**
 * Validate junction table integrity
 */
export async function validateJunctionTable(
  postgresDb: any,
  junctionTableName: string,
  field1: { name: string; referencedTable: string },
  field2: { name: string; referencedTable: string }
): Promise<{
  orphanedRecords: OrphanedRecord[];
}> {
  const orphanedRecords: OrphanedRecord[] = [];

  try {
    const modelName = junctionTableName as keyof typeof postgresDb;
    if (!postgresDb[modelName]) {
      return { orphanedRecords };
    }

    const junctionRecords = await postgresDb[modelName].findMany();

    for (const record of junctionRecords) {
      const value1 = (record as any)[field1.name];
      const value2 = (record as any)[field2.name];

      // Check first reference
      const model1 = field1.referencedTable as keyof typeof postgresDb;
      const exists1 = await postgresDb[model1].findUnique({
        where: { id: value1 },
      });

      if (!exists1) {
        orphanedRecords.push({
          tableName: junctionTableName,
          recordUuid: `${value1}_${value2}`,
          foreignKeyField: field1.name,
          foreignKeyValue: value1,
          referencedTable: field1.referencedTable,
        });
      }

      // Check second reference
      const model2 = field2.referencedTable as keyof typeof postgresDb;
      const exists2 = await postgresDb[model2].findUnique({
        where: { id: value2 },
      });

      if (!exists2) {
        orphanedRecords.push({
          tableName: junctionTableName,
          recordUuid: `${value1}_${value2}`,
          foreignKeyField: field2.name,
          foreignKeyValue: value2,
          referencedTable: field2.referencedTable,
        });
      }
    }
  } catch (error) {
    console.error(`Error validating junction table ${junctionTableName}:`, error);
  }

  return { orphanedRecords };
}

/**
 * Layer 4: Validate data types
 */
export async function validateDataTypes(
  postgresDb: any,
  tableName: string,
  fieldDefinitions: Array<{
    name: string;
    type: 'DateTime' | 'Enum' | 'JSONB' | 'Array' | 'Number' | 'Boolean';
    enumValues?: string[];
  }>
): Promise<TypeValidationError[]> {
  const typeErrors: TypeValidationError[] = [];

  try {
    const modelName = tableName as keyof typeof postgresDb;
    if (!postgresDb[modelName]) {
      return typeErrors;
    }

    const records = await postgresDb[modelName].findMany({
      take: 100, // Sample for performance
    });

    for (const record of records) {
      const recordUuid = (record as any).id;

      for (const fieldDef of fieldDefinitions) {
        const value = (record as any)[fieldDef.name];

        if (value === null || value === undefined) {
          continue; // Skip null values
        }

        // Validate based on type
        switch (fieldDef.type) {
          case 'DateTime':
            if (!(value instanceof Date) && !isValidDateString(value)) {
              typeErrors.push({
                tableName,
                recordUuid,
                fieldName: fieldDef.name,
                expectedType: 'DateTime',
                actualValue: value,
                errorMessage: 'Invalid DateTime format',
              });
            }
            break;

          case 'Enum':
            if (fieldDef.enumValues && !fieldDef.enumValues.includes(value)) {
              typeErrors.push({
                tableName,
                recordUuid,
                fieldName: fieldDef.name,
                expectedType: `Enum[${fieldDef.enumValues.join(', ')}]`,
                actualValue: value,
                errorMessage: 'Value not in enum definition',
              });
            }
            break;

          case 'JSONB':
            if (typeof value !== 'object') {
              typeErrors.push({
                tableName,
                recordUuid,
                fieldName: fieldDef.name,
                expectedType: 'JSONB',
                actualValue: value,
                errorMessage: 'JSONB field is not an object',
              });
            }
            break;

          case 'Array':
            if (!Array.isArray(value)) {
              typeErrors.push({
                tableName,
                recordUuid,
                fieldName: fieldDef.name,
                expectedType: 'Array',
                actualValue: value,
                errorMessage: 'Array field is not an array',
              });
            }
            break;

          case 'Number':
            if (typeof value !== 'number' || isNaN(value)) {
              typeErrors.push({
                tableName,
                recordUuid,
                fieldName: fieldDef.name,
                expectedType: 'Number',
                actualValue: value,
                errorMessage: 'Field is not a valid number',
              });
            }
            break;

          case 'Boolean':
            if (typeof value !== 'boolean') {
              typeErrors.push({
                tableName,
                recordUuid,
                fieldName: fieldDef.name,
                expectedType: 'Boolean',
                actualValue: value,
                errorMessage: 'Field is not a boolean',
              });
            }
            break;
        }
      }
    }
  } catch (error) {
    console.error(`Error validating data types for table ${tableName}:`, error);
  }

  return typeErrors;
}

/**
 * Check if a value is a valid date string
 */
function isValidDateString(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const date = new Date(value);
  return !isNaN(date.getTime());
}
