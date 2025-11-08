/**
 * Integration Factory Tests
 */

import { IntegrationFactory } from '@/lib/integrations/factory';
import { XeroIntegrationService } from '@/lib/integrations/xero';
import { StripeIntegrationService } from '@/lib/integrations/stripe';
import { PayPalIntegrationService } from '@/lib/integrations/paypal';

describe('IntegrationFactory', () => {
  describe('createService', () => {
    it('should create XeroIntegrationService for XERO type', () => {
      const credentials = {
        id: 'test-1',
        userId: 'user-1',
        integrationType: 'XERO' as const,
        integrationName: 'Xero Test',
        accessToken: 'test-token',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'IDLE' as const,
      };

      const service = IntegrationFactory.createService(credentials);
      expect(service).toBeInstanceOf(XeroIntegrationService);
    });

    it('should create StripeIntegrationService for STRIPE type', () => {
      const credentials = {
        id: 'test-2',
        userId: 'user-1',
        integrationType: 'STRIPE' as const,
        integrationName: 'Stripe Test',
        apiKey: 'sk_test_123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'IDLE' as const,
      };

      const service = IntegrationFactory.createService(credentials);
      expect(service).toBeInstanceOf(StripeIntegrationService);
    });

    it('should create PayPalIntegrationService for PAYPAL type', () => {
      const credentials = {
        id: 'test-3',
        userId: 'user-1',
        integrationType: 'PAYPAL' as const,
        integrationName: 'PayPal Test',
        accessToken: 'paypal-token',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'IDLE' as const,
      };

      const service = IntegrationFactory.createService(credentials);
      expect(service).toBeInstanceOf(PayPalIntegrationService);
    });

    it('should throw error for unsupported integration type', () => {
      const credentials = {
        id: 'test-4',
        userId: 'user-1',
        integrationType: 'INVALID' as any,
        integrationName: 'Invalid Test',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'IDLE' as const,
      };

      expect(() => IntegrationFactory.createService(credentials)).toThrow(
        'Unsupported integration type: INVALID'
      );
    });
  });

  describe('getSupportedIntegrations', () => {
    it('should return all supported integrations', () => {
      const integrations = IntegrationFactory.getSupportedIntegrations();
      expect(integrations.length).toBe(7);
      expect(integrations.map((i) => i.type)).toContain('XERO');
      expect(integrations.map((i) => i.type)).toContain('STRIPE');
      expect(integrations.map((i) => i.type)).toContain('PAYPAL');
    });

    it('should have correct properties for each integration', () => {
      const integrations = IntegrationFactory.getSupportedIntegrations();
      integrations.forEach((integration) => {
        expect(integration).toHaveProperty('type');
        expect(integration).toHaveProperty('name');
        expect(integration).toHaveProperty('description');
        expect(integration).toHaveProperty('category');
      });
    });
  });

  describe('getIntegrationsByCategory', () => {
    it('should return only Accounting integrations', () => {
      const integrations = IntegrationFactory.getIntegrationsByCategory(
        'Accounting'
      );
      expect(integrations.length).toBe(3);
      expect(integrations.map((i) => i.type)).toContain('XERO');
      expect(integrations.map((i) => i.type)).toContain('MYOB');
      expect(integrations.map((i) => i.type)).toContain('QUICKBOOKS');
    });

    it('should return only Payment integrations', () => {
      const integrations = IntegrationFactory.getIntegrationsByCategory(
        'Payments'
      );
      expect(integrations.length).toBe(2);
      expect(integrations.map((i) => i.type)).toContain('STRIPE');
      expect(integrations.map((i) => i.type)).toContain('PAYPAL');
    });

    it('should return only Marketing integrations', () => {
      const integrations = IntegrationFactory.getIntegrationsByCategory(
        'Marketing'
      );
      expect(integrations.length).toBe(2);
      expect(integrations.map((i) => i.type)).toContain('BILLIONMAIL');
      expect(integrations.map((i) => i.type)).toContain('MAUTIC');
    });

    it('should return empty array for unknown category', () => {
      const integrations = IntegrationFactory.getIntegrationsByCategory(
        'Unknown'
      );
      expect(integrations.length).toBe(0);
    });
  });
});
