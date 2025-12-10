/**
 * Progress tracking system for migration
 * Provides real-time console output with progress bars, ETA, and statistics
 */

import { ProgressInfo, TableMigrationStats } from './types';
import {
  calculatePercentage,
  calculateRecordsPerSecond,
  estimateRemainingTime,
  formatDuration,
  formatNumber,
} from './utils';

/**
 * ProgressTracker class manages migration progress display
 */
export class ProgressTracker {
  private startTime: Date;
  private tableStats: Map<string, TableMigrationStats>;
  private currentTable: string | null;
  private totalTables: number;
  private completedTables: number;
  private overallRecordsProcessed: number;
  private overallRecordsTotal: number;

  constructor(totalTables: number = 0) {
    this.startTime = new Date();
    this.tableStats = new Map();
    this.currentTable = null;
    this.totalTables = totalTables;
    this.completedTables = 0;
    this.overallRecordsProcessed = 0;
    this.overallRecordsTotal = 0;
  }

  /**
   * Starts tracking for a new table
   */
  startTable(tableName: string, totalRecords: number): void {
    this.currentTable = tableName;

    const stats: TableMigrationStats = {
      tableName,
      totalRecords,
      migratedRecords: 0,
      failedRecords: 0,
      startTime: new Date(),
    };

    this.tableStats.set(tableName, stats);
    this.overallRecordsTotal += totalRecords;

    this.displayTableStart(tableName, totalRecords);
  }

  /**
   * Updates progress for current table
   */
  updateTableProgress(
    tableName: string,
    migratedRecords: number,
    totalRecords: number
  ): void {
    const stats = this.tableStats.get(tableName);
    if (!stats) {
      // Initialize if not found
      this.startTable(tableName, totalRecords);
      return;
    }

    stats.migratedRecords = migratedRecords;

    this.overallRecordsProcessed += 1;

    this.displayProgress(tableName);
  }

  /**
   * Marks table as complete
   */
  completeTable(tableName: string): void {
    const stats = this.tableStats.get(tableName);
    if (!stats) return;

    stats.endTime = new Date();
    stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
    stats.recordsPerSecond = calculateRecordsPerSecond(
      stats.migratedRecords,
      stats.duration
    );

    this.completedTables += 1;
    this.currentTable = null;

    this.displayTableComplete(stats);
  }

  /**
   * Gets current progress information
   */
  getProgressInfo(): ProgressInfo {
    const currentStats = this.currentTable
      ? this.tableStats.get(this.currentTable)
      : null;

    const elapsedMs = Date.now() - this.startTime.getTime();
    const recordsPerSecond = calculateRecordsPerSecond(
      this.overallRecordsProcessed,
      elapsedMs
    );
    const estimatedMs = estimateRemainingTime(
      this.overallRecordsProcessed,
      this.overallRecordsTotal,
      elapsedMs
    );

    return {
      currentTable: this.currentTable || '',
      currentPhase: this.completedTables + 1,
      totalPhases: this.totalTables,
      tableRecordsProcessed: currentStats?.migratedRecords || 0,
      tableRecordsTotal: currentStats?.totalRecords || 0,
      overallRecordsProcessed: this.overallRecordsProcessed,
      overallRecordsTotal: this.overallRecordsTotal,
      estimatedTimeRemaining: estimatedMs,
      recordsPerSecond,
    };
  }

  /**
   * Gets all table statistics
   */
  getAllTableStats(): TableMigrationStats[] {
    return Array.from(this.tableStats.values());
  }

  /**
   * Gets overall migration statistics
   */
  getOverallStats(): {
    totalDuration: number;
    totalRecordsProcessed: number;
    totalRecordsFailed: number;
    overallRecordsPerSecond: number;
  } {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    let totalRecordsFailed = 0;
    this.tableStats.forEach(stats => {
      totalRecordsFailed += stats.failedRecords;
    });

    const overallRecordsPerSecond = calculateRecordsPerSecond(
      this.overallRecordsProcessed,
      totalDuration
    );

    return {
      totalDuration,
      totalRecordsProcessed: this.overallRecordsProcessed,
      totalRecordsFailed,
      overallRecordsPerSecond,
    };
  }

  /**
   * Displays migration header
   */
  displayHeader(): void {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('  MongoDB → PostgreSQL Migration');
    console.log('='.repeat(60));
    console.log(`  Start Time: ${this.startTime.toISOString()}`);
    console.log(`  Total Tables: ${this.totalTables}`);
    console.log('='.repeat(60));
    console.log('\n');
  }

  /**
   * Displays checkpoint resume message
   */
  displayCheckpointResume(completedTables: number, recordsMigrated: number): void {
    console.log('\n');
    console.log('[CHECKPOINT] Resuming from previous migration');
    console.log(`  Completed Tables: ${completedTables}`);
    console.log(`  Records Already Migrated: ${formatNumber(recordsMigrated)}`);
    console.log('\n');
  }

  /**
   * Displays table start
   */
  private displayTableStart(tableName: string, totalRecords: number): void {
    console.log('\n');
    console.log(`[TABLE] ${tableName}`);
    console.log(`  Total Records: ${formatNumber(totalRecords)}`);
  }

  /**
   * Displays current progress
   */
  private displayProgress(tableName: string): void {
    const stats = this.tableStats.get(tableName);
    if (!stats) return;

    const percentage = calculatePercentage(
      stats.migratedRecords,
      stats.totalRecords
    );
    const elapsed = Date.now() - stats.startTime.getTime();
    const recordsPerSecond = calculateRecordsPerSecond(stats.migratedRecords, elapsed);

    // Simple progress bar
    const barLength = 40;
    const filledLength = Math.floor((percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    // Use \r to update the same line
    process.stdout.write(
      `\r  Progress: [${bar}] ${percentage}% ` +
      `(${formatNumber(stats.migratedRecords)}/${formatNumber(stats.totalRecords)}) ` +
      `| ${recordsPerSecond} rec/sec`
    );
  }

  /**
   * Displays table completion
   */
  private displayTableComplete(stats: TableMigrationStats): void {
    console.log('\n'); // New line after progress bar
    console.log(
      `  ✓ Completed in ${formatDuration(stats.duration || 0)} ` +
      `(${stats.recordsPerSecond} rec/sec)`
    );

    if (stats.failedRecords > 0) {
      console.log(`  ⚠ Failed Records: ${stats.failedRecords}`);
    }

    // Overall progress
    const overallPercentage = calculatePercentage(
      this.completedTables,
      this.totalTables
    );
    console.log(
      `  Overall: ${this.completedTables}/${this.totalTables} tables ` +
      `(${overallPercentage}%)`
    );
  }

  /**
   * Displays final migration summary
   */
  displaySummary(): void {
    const overall = this.getOverallStats();

    console.log('\n');
    console.log('='.repeat(60));
    console.log('  Migration Complete!');
    console.log('='.repeat(60));
    console.log(`  Total Duration: ${formatDuration(overall.totalDuration)}`);
    console.log(`  Total Records: ${formatNumber(overall.totalRecordsProcessed)}`);
    console.log(`  Failed Records: ${formatNumber(overall.totalRecordsFailed)}`);
    console.log(`  Success Rate: ${calculatePercentage(
      overall.totalRecordsProcessed - overall.totalRecordsFailed,
      overall.totalRecordsProcessed
    )}%`);
    console.log(`  Average Speed: ${overall.overallRecordsPerSecond} rec/sec`);
    console.log('='.repeat(60));
    console.log('\n');

    // Display slowest tables
    const sortedStats = this.getAllTableStats()
      .filter(s => s.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5);

    if (sortedStats.length > 0) {
      console.log('Top 5 Slowest Tables:');
      sortedStats.forEach((stats, index) => {
        console.log(
          `  ${index + 1}. ${stats.tableName}: ` +
          `${formatDuration(stats.duration || 0)} ` +
          `(${formatNumber(stats.totalRecords)} records)`
        );
      });
      console.log('\n');
    }
  }

  /**
   * Displays error summary
   */
  displayErrorSummary(totalErrors: number): void {
    if (totalErrors === 0) {
      console.log('✓ No errors encountered during migration');
      return;
    }

    console.log('\n');
    console.log('⚠ Error Summary:');
    console.log(`  Total Errors: ${totalErrors}`);
    console.log('  See migration-errors.log for details');
    console.log('\n');
  }

  /**
   * Displays checkpoint save message
   */
  displayCheckpointSave(): void {
    console.log('\n[CHECKPOINT] Progress saved\n');
  }

  /**
   * Displays graceful shutdown message
   */
  displayGracefulShutdown(): void {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('  Migration Paused (Ctrl+C detected)');
    console.log('='.repeat(60));
    console.log('  Checkpoint saved successfully');
    console.log('  Safe to exit');
    console.log('  Run migration again to resume from checkpoint');
    console.log('='.repeat(60));
    console.log('\n');
  }
}
