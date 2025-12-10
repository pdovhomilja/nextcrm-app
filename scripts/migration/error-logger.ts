/**
 * Error logging system for migration
 * Captures and logs detailed error information for failed record migrations
 */

import fs from 'fs/promises';
import path from 'path';
import { MigrationError, ErrorSummary } from './types';
import { getCurrentTimestamp, sanitizeForLog, formatNumber } from './utils';

/**
 * ErrorLogger class manages error logging and reporting
 */
export class ErrorLogger {
  private errorLogFile: string;
  private errors: MigrationError[] = [];
  private errorsByTable: Map<string, number> = new Map();
  private logFileHandle: fs.FileHandle | null = null;

  constructor(errorLogFile?: string) {
    this.errorLogFile = errorLogFile || path.join(process.cwd(), 'migration-errors.log');
  }

  /**
   * Initializes the error logger (opens log file)
   */
  async initialize(): Promise<void> {
    try {
      // Open file in append mode
      this.logFileHandle = await fs.open(this.errorLogFile, 'a');

      // Write header if file is new
      try {
        const stats = await fs.stat(this.errorLogFile);
        if (stats.size === 0) {
          await this.writeToFile(
            '='.repeat(80) + '\n' +
            'Migration Error Log\n' +
            `Started: ${getCurrentTimestamp()}\n` +
            '='.repeat(80) + '\n\n'
          );
        }
      } catch (error) {
        // File might not exist yet, that's okay
      }
    } catch (error) {
      console.error('Failed to initialize error logger:', error);
      throw error;
    }
  }

  /**
   * Closes the error log file
   */
  async close(): Promise<void> {
    if (this.logFileHandle) {
      try {
        await this.logFileHandle.close();
        this.logFileHandle = null;
      } catch (error) {
        console.error('Failed to close error log file:', error);
      }
    }
  }

  /**
   * Clears the error log file
   */
  async clearErrorLog(): Promise<void> {
    try {
      // Close existing handle
      await this.close();

      // Delete the file
      try {
        await fs.unlink(this.errorLogFile);
      } catch (error) {
        // File might not exist, that's okay
      }

      // Clear in-memory data
      this.errors = [];
      this.errorsByTable.clear();

      console.log('Error log cleared');
    } catch (error) {
      console.error('Failed to clear error log:', error);
    }
  }

  /**
   * Logs an error for a failed record migration
   */
  async logError(
    tableName: string,
    mongoId: string,
    error: Error,
    document: unknown,
    batchNumber?: number
  ): Promise<void> {
    const migrationError: MigrationError = {
      tableName,
      mongoId,
      errorMessage: error.message,
      errorStack: error.stack,
      originalDocument: document,
      timestamp: getCurrentTimestamp(),
      batchNumber,
    };

    // Store in memory
    this.errors.push(migrationError);

    // Update error count by table
    const currentCount = this.errorsByTable.get(tableName) || 0;
    this.errorsByTable.set(tableName, currentCount + 1);

    // Write to file
    await this.writeErrorToFile(migrationError);

    // Log to console (brief)
    console.error(
      `\n[ERROR] ${tableName} - ${mongoId}: ${sanitizeForLog(error.message, 100)}`
    );
  }

  /**
   * Writes error details to log file
   */
  private async writeErrorToFile(error: MigrationError): Promise<void> {
    try {
      const logEntry = this.formatErrorLogEntry(error);
      await this.writeToFile(logEntry + '\n' + '-'.repeat(80) + '\n\n');
    } catch (err) {
      console.error('Failed to write error to log file:', err);
    }
  }

  /**
   * Formats error as log entry
   */
  private formatErrorLogEntry(error: MigrationError): string {
    let entry = `[${error.timestamp}] ERROR in table "${error.tableName}"\n`;
    entry += `MongoDB ObjectId: ${error.mongoId}\n`;

    if (error.uuid) {
      entry += `PostgreSQL UUID: ${error.uuid}\n`;
    }

    if (error.batchNumber !== undefined) {
      entry += `Batch Number: ${error.batchNumber}\n`;
    }

    entry += `\nError Message:\n${error.errorMessage}\n`;

    if (error.errorStack) {
      entry += `\nStack Trace:\n${error.errorStack}\n`;
    }

    entry += `\nOriginal Document:\n${JSON.stringify(error.originalDocument, null, 2)}\n`;

    return entry;
  }

  /**
   * Writes data to log file
   */
  private async writeToFile(data: string): Promise<void> {
    if (!this.logFileHandle) {
      // Initialize if not already done
      await this.initialize();
    }

    if (!this.logFileHandle) {
      throw new Error('Error log file not initialized');
    }

    await this.logFileHandle.write(data, null, 'utf-8');
  }

  /**
   * Generates error summary report
   */
  generateErrorSummary(): ErrorSummary {
    // Count errors by table
    const errorsByTable: Record<string, number> = {};
    this.errorsByTable.forEach((count, tableName) => {
      errorsByTable[tableName] = count;
    });

    // Get all failed ObjectIds
    const failedObjectIds = this.errors.map(e => e.mongoId);

    // Identify common error patterns
    const errorPatterns = this.identifyErrorPatterns();

    return {
      totalErrors: this.errors.length,
      errorsByTable,
      failedObjectIds,
      errorPatterns,
    };
  }

  /**
   * Identifies common error patterns
   */
  private identifyErrorPatterns(): Array<{
    pattern: string;
    count: number;
    example: string;
  }> {
    const patternMap = new Map<string, { count: number; example: string }>();

    for (const error of this.errors) {
      // Extract pattern from error message
      let pattern = error.errorMessage;

      // Common patterns
      if (pattern.includes('foreign key constraint')) {
        pattern = 'Foreign key constraint violation';
      } else if (pattern.includes('unique constraint')) {
        pattern = 'Unique constraint violation';
      } else if (pattern.includes('not null')) {
        pattern = 'Not null constraint violation';
      } else if (pattern.includes('invalid input syntax')) {
        pattern = 'Invalid input syntax';
      } else if (pattern.includes('type')) {
        pattern = 'Type conversion error';
      } else {
        // Use first 50 chars as pattern
        pattern = pattern.substring(0, 50);
      }

      const existing = patternMap.get(pattern);
      if (existing) {
        existing.count++;
      } else {
        patternMap.set(pattern, {
          count: 1,
          example: error.errorMessage,
        });
      }
    }

    // Convert to array and sort by count
    return Array.from(patternMap.entries())
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        example: data.example,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 patterns
  }

  /**
   * Writes error summary to log file
   */
  async writeErrorSummary(): Promise<void> {
    const summary = this.generateErrorSummary();

    let summaryText = '\n' + '='.repeat(80) + '\n';
    summaryText += 'Error Summary\n';
    summaryText += '='.repeat(80) + '\n\n';

    summaryText += `Total Errors: ${formatNumber(summary.totalErrors)}\n\n`;

    if (Object.keys(summary.errorsByTable).length > 0) {
      summaryText += 'Errors by Table:\n';
      Object.entries(summary.errorsByTable)
        .sort(([, a], [, b]) => b - a)
        .forEach(([table, count]) => {
          summaryText += `  ${table}: ${formatNumber(count)}\n`;
        });
      summaryText += '\n';
    }

    if (summary.errorPatterns.length > 0) {
      summaryText += 'Common Error Patterns:\n';
      summary.errorPatterns.forEach((pattern, index) => {
        summaryText += `  ${index + 1}. ${pattern.pattern} (${formatNumber(pattern.count)} occurrences)\n`;
        summaryText += `     Example: ${sanitizeForLog(pattern.example, 100)}\n`;
      });
      summaryText += '\n';
    }

    summaryText += `Total Failed Record IDs: ${summary.failedObjectIds.length}\n`;
    summaryText += '(See error entries above for specific ObjectIds)\n\n';

    summaryText += '='.repeat(80) + '\n';
    summaryText += `Summary Generated: ${getCurrentTimestamp()}\n`;
    summaryText += '='.repeat(80) + '\n';

    await this.writeToFile(summaryText);
  }

  /**
   * Displays error summary to console
   */
  displayErrorSummary(): void {
    const summary = this.generateErrorSummary();

    if (summary.totalErrors === 0) {
      console.log('\n✓ No errors encountered during migration\n');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('Error Summary');
    console.log('='.repeat(60));
    console.log(`Total Errors: ${formatNumber(summary.totalErrors)}`);

    if (Object.keys(summary.errorsByTable).length > 0) {
      console.log('\nErrors by Table:');
      Object.entries(summary.errorsByTable)
        .sort(([, a], [, b]) => b - a)
        .forEach(([table, count]) => {
          console.log(`  ${table}: ${formatNumber(count)}`);
        });
    }

    if (summary.errorPatterns.length > 0) {
      console.log('\nTop Error Patterns:');
      summary.errorPatterns.slice(0, 5).forEach((pattern, index) => {
        console.log(`  ${index + 1}. ${pattern.pattern} (${formatNumber(pattern.count)})`);
      });
    }

    console.log(`\nSee ${this.errorLogFile} for full error details`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Gets total error count
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Gets error count for specific table
   */
  getTableErrorCount(tableName: string): number {
    return this.errorsByTable.get(tableName) || 0;
  }

  /**
   * Checks if table has errors
   */
  hasTableErrors(tableName: string): boolean {
    return (this.errorsByTable.get(tableName) || 0) > 0;
  }

  /**
   * Gets all errors for a specific table
   */
  getTableErrors(tableName: string): MigrationError[] {
    return this.errors.filter(e => e.tableName === tableName);
  }
}
