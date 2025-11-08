/**
 * Base Integration Service Tests
 */

import { BaseIntegrationService } from '@/lib/integrations/base';

// Mock implementation for testing
class MockIntegrationService extends BaseIntegrationService {
  async authenticate(): Promise<boolean> {
    return !!this.credentials.accessToken;
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async syncData(dataType: string): Promise<any> {
    return {
      success: true,
      totalRecords: 10,
      syncedRecords: 10,
      failedRecords: 0,
      duration: 100,
      message: 'Sync completed',
    };
  }
}

describe('BaseIntegrationService', () => {
  let service: MockIntegrationService;

  beforeEach(() => {
    service = new MockIntegrationService({
      id: 'test-1',
      userId: 'user-1',
      integrationType: 'XERO',
      integrationName: 'Test Integration',
      accessToken: 'test-token',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'IDLE',
    } as any);
  });

  describe('authenticate', () => {
    it('should authenticate successfully with valid token', async () => {
      const result = await service.authenticate();
      expect(result).toBe(true);
    });

    it('should fail authentication without token', async () => {
      service.credentials.accessToken = undefined;
      const result = await service.authenticate();
      expect(result).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false if token expiration is not set', () => {
      service.credentials.tokenExpiresAt = undefined;
      expect(service.isTokenExpired()).toBe(false);
    });

    it('should return false if token expires in future', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      service.credentials.tokenExpiresAt = futureDate;
      expect(service.isTokenExpired()).toBe(false);
    });

    it('should return true if token expires within 5 minutes', () => {
      const expiringDate = new Date(Date.now() + 3 * 60 * 1000);
      service.credentials.tokenExpiresAt = expiringDate;
      expect(service.isTokenExpired()).toBe(true);
    });

    it('should return true if token has expired', () => {
      const pastDate = new Date(Date.now() - 1000);
      service.credentials.tokenExpiresAt = pastDate;
      expect(service.isTokenExpired()).toBe(true);
    });
  });

  describe('handleError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      const message = service.handleError(error);
      expect(message).toBe('Test error');
    });

    it('should handle string errors', () => {
      const error = 'String error';
      const message = service.handleError(error);
      expect(message).toBe('String error');
    });

    it('should handle unknown error types', () => {
      const error = { unknown: 'error' };
      const message = service.handleError(error);
      expect(message).toBe('Unknown error occurred');
    });
  });

  describe('retryRequest', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await service.retryRequest(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = jest.fn();
      fn.mockRejectedValueOnce(new Error('Attempt 1'));
      fn.mockResolvedValueOnce('success');

      const result = await service.retryRequest(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Failed'));
      await expect(service.retryRequest(fn, 2, 10)).rejects.toThrow('Failed');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('syncData', () => {
    it('should return sync result with success', async () => {
      const result = await service.syncData('test');
      expect(result.success).toBe(true);
      expect(result.totalRecords).toBe(10);
      expect(result.syncedRecords).toBe(10);
    });
  });
});
