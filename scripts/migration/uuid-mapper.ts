/**
 * ObjectId to UUID mapping manager
 * Manages the transformation of MongoDB ObjectIds to PostgreSQL UUIDs
 * while maintaining referential integrity throughout the migration
 */

import { generateUuid, isValidObjectId, isValidUuid } from './utils';
import { ObjectIdUuidMapping } from './types';

/**
 * Helper function to convert MongoDB ObjectId to string
 */
function toObjectIdString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.toString) return value.toString();
  return String(value);
}

/**
 * UuidMapper class manages ObjectId → UUID mappings
 */
export class UuidMapper {
  private mapping: ObjectIdUuidMapping;

  constructor(existingMapping?: Record<string, string>) {
    this.mapping = new Map();

    // Load existing mapping if provided (from checkpoint)
    if (existingMapping) {
      this.restoreMapping(existingMapping);
    }
  }

  /**
   * Restores mapping from a plain object (from checkpoint)
   * @param mappingObject Object with ObjectId keys and UUID values
   */
  restoreMapping(mappingObject: Record<string, string>): void {
    Object.entries(mappingObject).forEach(([objectId, uuid]) => {
      if (isValidObjectId(objectId) && isValidUuid(uuid)) {
        this.mapping.set(objectId, uuid);
      }
    });
  }

  /**
   * Generates a new UUID for a MongoDB ObjectId and stores the mapping.
   * If the ObjectId already has a UUID mapping, returns the existing UUID.
   * @param mongoId MongoDB ObjectId string or ObjectId object
   * @returns UUID string
   */
  generateAndMapUuid(mongoId: any): string {
    const mongoIdStr = toObjectIdString(mongoId);

    if (!isValidObjectId(mongoIdStr)) {
      throw new Error(`Invalid MongoDB ObjectId format: ${mongoIdStr}`);
    }

    // Check if mapping already exists
    const existingUuid = this.mapping.get(mongoIdStr);
    if (existingUuid) {
      return existingUuid;
    }

    // Generate new UUID and store mapping
    const newUuid = generateUuid();
    this.mapping.set(mongoIdStr, newUuid);
    return newUuid;
  }

  /**
   * Retrieves the UUID for a given MongoDB ObjectId
   * @param mongoId MongoDB ObjectId string or ObjectId object
   * @returns UUID string or undefined if not mapped
   */
  getUuidForMongoId(mongoId: any): string | undefined {
    if (!mongoId) return undefined;

    const mongoIdStr = toObjectIdString(mongoId);

    if (!isValidObjectId(mongoIdStr)) {
      console.warn(`Invalid MongoDB ObjectId format: ${mongoIdStr}`);
      return undefined;
    }

    return this.mapping.get(mongoIdStr);
  }

  /**
   * Batch mapping for multiple ObjectIds
   * Generates UUIDs for all ObjectIds that don't have mappings yet
   * @param mongoIds Array of MongoDB ObjectId strings or ObjectId objects
   * @returns Map of ObjectId to UUID
   */
  bulkMapIds(mongoIds: any[]): Map<string, string> {
    const result = new Map<string, string>();

    for (const mongoId of mongoIds) {
      const mongoIdStr = toObjectIdString(mongoId);

      if (!mongoIdStr || !isValidObjectId(mongoIdStr)) {
        console.warn(`Skipping invalid ObjectId in bulk operation: ${mongoIdStr}`);
        continue;
      }

      const uuid = this.generateAndMapUuid(mongoIdStr);
      result.set(mongoIdStr, uuid);
    }

    return result;
  }

  /**
   * Transforms a single foreign key reference from ObjectId to UUID
   * @param mongoId MongoDB ObjectId string or ObjectId object (can be null/undefined)
   * @returns UUID string or null
   */
  transformForeignKey(mongoId: any): string | null {
    if (!mongoId) return null;

    const uuid = this.getUuidForMongoId(mongoId);
    if (!uuid) {
      const mongoIdStr = toObjectIdString(mongoId);
      console.warn(`No UUID mapping found for foreign key ObjectId: ${mongoIdStr}`);
      return null;
    }

    return uuid;
  }

  /**
   * Transforms an array of foreign key references from ObjectIds to UUIDs
   * @param mongoIds Array of MongoDB ObjectId strings or ObjectId objects
   * @returns Array of UUID strings (filters out unmapped IDs)
   */
  transformForeignKeyArray(mongoIds: any[] | null | undefined): string[] {
    if (!mongoIds || !Array.isArray(mongoIds)) return [];

    return mongoIds
      .map(id => toObjectIdString(id))
      .filter(id => id && isValidObjectId(id))
      .map(id => this.getUuidForMongoId(id))
      .filter((uuid): uuid is string => uuid !== undefined);
  }

  /**
   * Validates that a foreign key exists in the mapping
   * Useful for pre-migration validation
   * @param mongoId MongoDB ObjectId string or ObjectId object
   * @returns boolean
   */
  hasMapping(mongoId: any): boolean {
    if (!mongoId) return false;
    const mongoIdStr = toObjectIdString(mongoId);
    if (!isValidObjectId(mongoIdStr)) return false;
    return this.mapping.has(mongoIdStr);
  }

  /**
   * Gets the total number of mappings
   * @returns number of mappings
   */
  getMappingCount(): number {
    return this.mapping.size;
  }

  /**
   * Exports the mapping as a plain object (for checkpoint serialization)
   * @returns Object with ObjectId keys and UUID values
   */
  exportMapping(): Record<string, string> {
    const obj: Record<string, string> = {};
    this.mapping.forEach((uuid, objectId) => {
      obj[objectId] = uuid;
    });
    return obj;
  }

  /**
   * Clears all mappings (use with caution)
   */
  clear(): void {
    this.mapping.clear();
  }

  /**
   * Gets all mapped ObjectIds
   * @returns Array of MongoDB ObjectId strings
   */
  getAllMappedObjectIds(): string[] {
    return Array.from(this.mapping.keys());
  }

  /**
   * Gets all mapped UUIDs
   * @returns Array of UUID strings
   */
  getAllMappedUuids(): string[] {
    return Array.from(this.mapping.values());
  }

  /**
   * Batch validates that all provided ObjectIds have mappings
   * @param mongoIds Array of MongoDB ObjectId strings or ObjectId objects
   * @returns Object with validation results
   */
  validateMappings(mongoIds: any[]): {
    valid: string[];
    invalid: string[];
    missing: string[];
  } {
    const valid: string[] = [];
    const invalid: string[] = [];
    const missing: string[] = [];

    for (const mongoId of mongoIds) {
      if (!mongoId) continue;

      const mongoIdStr = toObjectIdString(mongoId);

      if (!isValidObjectId(mongoIdStr)) {
        invalid.push(mongoIdStr);
        continue;
      }

      if (this.hasMapping(mongoIdStr)) {
        valid.push(mongoIdStr);
      } else {
        missing.push(mongoIdStr);
      }
    }

    return { valid, invalid, missing };
  }
}
