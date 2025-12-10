/**
 * Utility functions for MongoDB to PostgreSQL migration
 */

import { randomUUID } from 'crypto';
import { ObjectIdUuidMapping } from './types';

/**
 * Validates that a string is a valid MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Validates that a string is a valid UUID format
 */
export function isValidUuid(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Converts a MongoDB Date to ISO 8601 string format for PostgreSQL
 */
export function convertDateToISO(date: Date | string | null | undefined): string | null {
  if (!date) return null;

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    return dateObj.toISOString();
  } catch (error) {
    console.warn('Failed to convert date:', date, error);
    return null;
  }
}

/**
 * Safely converts a value to boolean
 */
export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return Boolean(value);
}

/**
 * Validates enum value against allowed values
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  defaultValue?: T
): T | null {
  if (!value) return defaultValue ?? null;

  const stringValue = String(value);
  if (allowedValues.includes(stringValue as T)) {
    return stringValue as T;
  }

  if (defaultValue !== undefined) {
    console.warn(`Invalid enum value "${stringValue}", using default "${defaultValue}"`);
    return defaultValue;
  }

  return null;
}

/**
 * Safely handles null or undefined values
 */
export function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

/**
 * Safely handles null or undefined values for numbers
 */
export function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Transforms an array of MongoDB ObjectIds to UUIDs using the mapping
 */
export function transformObjectIdArray(
  objectIds: string[] | undefined | null,
  mapping: ObjectIdUuidMapping
): string[] {
  if (!objectIds || !Array.isArray(objectIds)) return [];

  return objectIds
    .filter(id => id && isValidObjectId(id))
    .map(id => {
      const uuid = mapping.get(id);
      if (!uuid) {
        console.warn(`No UUID mapping found for ObjectId: ${id}`);
        return null;
      }
      return uuid;
    })
    .filter((uuid): uuid is string => uuid !== null);
}

/**
 * Transforms a single MongoDB ObjectId to UUID using the mapping
 */
export function transformObjectIdToUuid(
  objectId: string | undefined | null,
  mapping: ObjectIdUuidMapping
): string | null {
  if (!objectId) return null;

  if (!isValidObjectId(objectId)) {
    console.warn(`Invalid ObjectId format: ${objectId}`);
    return null;
  }

  const uuid = mapping.get(objectId);
  if (!uuid) {
    console.warn(`No UUID mapping found for ObjectId: ${objectId}`);
    return null;
  }

  return uuid;
}

/**
 * Generates a new UUID v4
 */
export function generateUuid(): string {
  return randomUUID();
}

/**
 * Calculates records per second based on processed count and duration
 */
export function calculateRecordsPerSecond(
  recordsProcessed: number,
  durationMs: number
): number {
  if (durationMs === 0) return 0;
  return Math.round((recordsProcessed / durationMs) * 1000);
}

/**
 * Estimates remaining time based on current progress
 */
export function estimateRemainingTime(
  processedRecords: number,
  totalRecords: number,
  elapsedMs: number
): number {
  if (processedRecords === 0 || processedRecords >= totalRecords) return 0;

  const recordsRemaining = totalRecords - processedRecords;
  const msPerRecord = elapsedMs / processedRecords;
  return Math.round(recordsRemaining * msPerRecord);
}

/**
 * Formats milliseconds to human-readable duration (e.g., "2m 30s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

/**
 * Formats a number with thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Calculates percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Deep clones an object (for checkpoint state)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Safely parses JSON, returns null on error
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Chunks an array into smaller arrays of specified size
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Delays execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitizes a string for safe logging (truncates if too long)
 */
export function sanitizeForLog(value: unknown, maxLength = 200): string {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Gets current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
