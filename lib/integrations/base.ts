/**
 * Base Integration Service
 * Provides common functionality for all integrations
 */

import { IntegrationCredentials, SyncResult } from './types';

export abstract class BaseIntegrationService {
  protected credentials: IntegrationCredentials;
  protected integrationType: string;

  constructor(credentials: IntegrationCredentials) {
    this.credentials = credentials;
    this.integrationType = credentials.integrationType;
  }

  /**
   * Authenticate with the external service
   */
  abstract authenticate(): Promise<boolean>;

  /**
   * Test connection to external service
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Sync data from external service
   */
  abstract syncData(dataType: string): Promise<SyncResult>;

  /**
   * Refresh authentication token if supported
   */
  protected async refreshAuthToken(): Promise<boolean> {
    return false;
  }

  /**
   * Log sync operation
   */
  protected async logSync(
    syncType: string,
    status: 'success' | 'failed' | 'partial',
    totalRecords: number,
    syncedRecords: number,
    failedRecords: number,
    errorMessage?: string,
    durationMs?: number
  ): Promise<void> {
    try {
      const response = await fetch('/api/integrations/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integrationType: this.integrationType,
          syncType,
          status,
          totalRecords,
          syncedRecords,
          failedRecords,
          errorMessage,
          durationMs: durationMs || 0,
        }),
      });

      if (!response.ok) {
        console.error('Failed to log sync operation');
      }
    } catch (error) {
      console.error('Error logging sync:', error);
    }
  }

  /**
   * Check if token needs refresh
   */
  protected isTokenExpired(): boolean {
    if (!this.credentials.tokenExpiresAt) {
      return false;
    }
    const expiresAt = new Date(this.credentials.tokenExpiresAt);
    const now = new Date();
    // Refresh if expires within 5 minutes
    return (expiresAt.getTime() - now.getTime()) < 5 * 60 * 1000;
  }

  /**
   * Handle API errors consistently
   */
  protected handleError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error occurred';
  }

  /**
   * Retry logic for failed requests
   */
  protected async retryRequest(
    fn: () => Promise<any>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<any> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }
}
