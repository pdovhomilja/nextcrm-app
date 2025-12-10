/**
 * Checkpoint and resume system for migration
 * Manages saving and loading migration state for pause/resume functionality
 */

import fs from 'fs/promises';
import path from 'path';
import { MigrationState } from './types';
import { getCurrentTimestamp, safeJsonParse } from './utils';

const CHECKPOINT_VERSION = '1.0';

/**
 * CheckpointManager class handles checkpoint persistence
 */
export class CheckpointManager {
  private checkpointFile: string;
  private currentState: MigrationState;

  constructor(checkpointFile?: string) {
    this.checkpointFile = checkpointFile || path.join(process.cwd(), 'migration-checkpoint.json');
    this.currentState = this.createInitialState();
  }

  /**
   * Saves current migration state to checkpoint file
   */
  async saveCheckpoint(state: MigrationState): Promise<void> {
    try {
      const checkpointData: MigrationState = {
        ...state,
        version: CHECKPOINT_VERSION,
        timestamp: getCurrentTimestamp(),
      };

      this.currentState = checkpointData;

      const json = JSON.stringify(checkpointData, null, 2);
      await fs.writeFile(this.checkpointFile, json, 'utf-8');
    } catch (error) {
      console.error('Failed to save checkpoint:', error);
      throw new Error(`Checkpoint save failed: ${error}`);
    }
  }

  /**
   * Loads migration state from checkpoint file
   * Returns null if no checkpoint exists or if checkpoint is invalid
   */
  async loadCheckpoint(): Promise<MigrationState | null> {
    try {
      // Check if checkpoint file exists
      const exists = await this.checkpointExists();
      if (!exists) {
        return null;
      }

      // Read checkpoint file
      const json = await fs.readFile(this.checkpointFile, 'utf-8');
      const data = safeJsonParse<MigrationState>(json);

      if (!data) {
        console.warn('Failed to parse checkpoint file, starting fresh migration');
        return null;
      }

      // Validate checkpoint version
      if (data.version !== CHECKPOINT_VERSION) {
        console.warn(
          `Checkpoint version mismatch (expected ${CHECKPOINT_VERSION}, got ${data.version}). ` +
          'Starting fresh migration.'
        );
        return null;
      }

      // Validate required fields
      if (!this.validateCheckpoint(data)) {
        console.warn('Invalid checkpoint structure, starting fresh migration');
        return null;
      }

      this.currentState = data;
      return data;
    } catch (error) {
      console.error('Error loading checkpoint:', error);
      return null;
    }
  }

  /**
   * Deletes checkpoint file (called after successful migration)
   */
  async deleteCheckpoint(): Promise<void> {
    try {
      const exists = await this.checkpointExists();
      if (exists) {
        await fs.unlink(this.checkpointFile);
        console.log('Checkpoint file deleted');
      }
    } catch (error) {
      console.error('Failed to delete checkpoint file:', error);
      // Non-fatal error, don't throw
    }
  }

  /**
   * Checks if checkpoint file exists
   */
  async checkpointExists(): Promise<boolean> {
    try {
      await fs.access(this.checkpointFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates initial checkpoint state
   */
  createInitialState(): MigrationState {
    return {
      version: CHECKPOINT_VERSION,
      timestamp: getCurrentTimestamp(),
      currentTable: null,
      completedTables: [],
      objectIdToUuidMap: {},
      migratedRecords: {},
      totalRecordsMigrated: 0,
      totalErrors: 0,
      currentBatch: 0,
    };
  }

  /**
   * Gets current state
   */
  getState(): MigrationState {
    return this.currentState;
  }

  /**
   * Saves current progress for a table
   */
  async saveCurrentProgress(tableName?: string, batchNumber?: number): Promise<void> {
    const state: MigrationState = {
      ...this.currentState,
      currentTable: tableName || this.currentState.currentTable,
      currentBatch: batchNumber || this.currentState.currentBatch || 0,
      timestamp: getCurrentTimestamp(),
    };

    await this.saveCheckpoint(state);
  }

  /**
   * Marks table as completed in checkpoint
   */
  async markTableCompleted(tableName: string): Promise<void> {
    const state = this.markTableCompletedInState(this.currentState, tableName);
    await this.saveCheckpoint(state);
  }

  /**
   * Updates checkpoint state with table progress
   */
  updateStateForTable(
    state: MigrationState,
    tableName: string,
    migratedUuids: string[]
  ): MigrationState {
    return {
      ...state,
      currentTable: tableName,
      migratedRecords: {
        ...state.migratedRecords,
        [tableName]: [
          ...(state.migratedRecords[tableName] || []),
          ...migratedUuids,
        ],
      },
      totalRecordsMigrated: state.totalRecordsMigrated + migratedUuids.length,
    };
  }

  /**
   * Marks table as completed in state
   */
  markTableCompletedInState(state: MigrationState, tableName: string): MigrationState {
    return {
      ...state,
      currentTable: null,
      completedTables: [...state.completedTables, tableName],
    };
  }

  /**
   * Updates ObjectId to UUID mapping in state
   */
  updateMapping(
    state: MigrationState,
    newMappings: Record<string, string>
  ): MigrationState {
    return {
      ...state,
      objectIdToUuidMap: {
        ...state.objectIdToUuidMap,
        ...newMappings,
      },
    };
  }

  /**
   * Increments error count in state
   */
  incrementErrors(state: MigrationState, errorCount: number = 1): MigrationState {
    return {
      ...state,
      totalErrors: state.totalErrors + errorCount,
    };
  }

  /**
   * Validates checkpoint structure
   */
  private validateCheckpoint(data: unknown): data is MigrationState {
    if (!data || typeof data !== 'object') return false;

    const state = data as Partial<MigrationState>;

    return (
      typeof state.version === 'string' &&
      typeof state.timestamp === 'string' &&
      (state.currentTable === null || typeof state.currentTable === 'string') &&
      Array.isArray(state.completedTables) &&
      typeof state.objectIdToUuidMap === 'object' &&
      typeof state.migratedRecords === 'object' &&
      typeof state.totalRecordsMigrated === 'number' &&
      typeof state.totalErrors === 'number'
    );
  }

  /**
   * Gets checkpoint file size for monitoring
   */
  async getCheckpointSize(): Promise<number> {
    try {
      const stats = await fs.stat(this.checkpointFile);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Creates a backup of the checkpoint file
   */
  async backupCheckpoint(): Promise<void> {
    try {
      const exists = await this.checkpointExists();
      if (!exists) return;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(
        process.cwd(),
        `migration-checkpoint.backup.${timestamp}.json`
      );

      await fs.copyFile(this.checkpointFile, backupFile);
      console.log(`Checkpoint backed up to: ${backupFile}`);
    } catch (error) {
      console.error('Failed to backup checkpoint:', error);
    }
  }

  /**
   * Validates that checkpoint can be resumed safely
   */
  async validateCheckpointForResume(): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const checkpoint = await this.loadCheckpoint();

    if (!checkpoint) {
      return { valid: false, reason: 'No checkpoint found' };
    }

    if (!checkpoint.objectIdToUuidMap || Object.keys(checkpoint.objectIdToUuidMap).length === 0) {
      return { valid: false, reason: 'Empty ObjectId mapping in checkpoint' };
    }

    if (checkpoint.completedTables.length === 0 && checkpoint.totalRecordsMigrated === 0) {
      return { valid: false, reason: 'No migration progress in checkpoint' };
    }

    return { valid: true };
  }

  /**
   * Gets checkpoint statistics for display
   */
  async getCheckpointStats(): Promise<{
    completedTables: number;
    totalRecordsMigrated: number;
    totalErrors: number;
    mappingCount: number;
    timestamp: string;
  } | null> {
    const checkpoint = await this.loadCheckpoint();

    if (!checkpoint) return null;

    return {
      completedTables: checkpoint.completedTables.length,
      totalRecordsMigrated: checkpoint.totalRecordsMigrated,
      totalErrors: checkpoint.totalErrors,
      mappingCount: Object.keys(checkpoint.objectIdToUuidMap).length,
      timestamp: checkpoint.timestamp,
    };
  }
}

/**
 * Sets up graceful shutdown handler for SIGINT (Ctrl+C)
 */
export function setupGracefulShutdown(
  checkpointManager: CheckpointManager,
  getCurrentState: () => MigrationState,
  onShutdown?: () => void
): void {
  let shutdownInProgress = false;

  const handleShutdown = async (signal: string) => {
    if (shutdownInProgress) {
      console.log('\nForce quit detected, exiting immediately...');
      process.exit(1);
    }

    shutdownInProgress = true;

    console.log(`\n\n[${signal}] Graceful shutdown initiated...`);
    console.log('Saving checkpoint...');

    try {
      const currentState = getCurrentState();
      await checkpointManager.saveCheckpoint(currentState);

      if (onShutdown) {
        onShutdown();
      }

      console.log('\n✓ Checkpoint saved successfully');
      console.log('✓ Safe to exit');
      console.log('Run the migration script again to resume from this checkpoint\n');

      process.exit(0);
    } catch (error) {
      console.error('\n✗ Failed to save checkpoint:', error);
      console.log('Migration state may be lost\n');
      process.exit(1);
    }
  };

  // Register handlers for various shutdown signals
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}
