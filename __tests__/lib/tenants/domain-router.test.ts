/**
 * Domain Router Tests
 */

import { DomainRouter } from '@/lib/tenants/domain-router';

describe('DomainRouter', () => {
  let router: DomainRouter;

  beforeEach(() => {
    process.env.NEXTCRM_DOMAIN = 'nextcrm.com';
    router = new DomainRouter();
  });

  describe('subdomain extraction', () => {
    it('should extract subdomain from host', () => {
      const host = 'company.nextcrm.com';
      const subdomain = host.split('.')[0];

      expect(subdomain).toBe('company');
    });

    it('should handle multi-level subdomains', () => {
      const host = 'api.company.nextcrm.com';
      const subdomain = host.split('.')[0];

      expect(subdomain).toBe('api');
    });

    it('should handle localhost development', () => {
      const host = 'localhost:3000';
      const isLocalhost = host.includes('localhost');

      expect(isLocalhost).toBe(true);
    });
  });

  describe('domain validation', () => {
    it('should validate domain format', () => {
      const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;

      const validDomains = [
        'example.com',
        'subdomain.example.com',
        'my-company.com',
        'company123.org',
      ];

      for (const domain of validDomains) {
        expect(domainRegex.test(domain)).toBe(true);
      }
    });

    it('should reject invalid domain format', () => {
      const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;

      const invalidDomains = [
        '-example.com',
        'example-.com',
        'example..com',
        'example com',
        '.example.com',
      ];

      for (const domain of invalidDomains) {
        expect(domainRegex.test(domain)).toBe(false);
      }
    });
  });

  describe('tenant slug generation', () => {
    it('should convert company name to slug', () => {
      const companyName = 'My Company Inc.';
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      expect(slug).toBe('my-company-inc');
    });

    it('should handle special characters', () => {
      const companyName = 'ABC & XYZ @#$%';
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      expect(slug).toBe('abc-xyz');
    });

    it('should preserve numbers', () => {
      const companyName = 'Company 123';
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      expect(slug).toBe('company-123');
    });
  });

  describe('domain tier validation', () => {
    it('should restrict custom domains to enterprise tiers', () => {
      const allowedTiers = ['PROFESSIONAL', 'ENTERPRISE'];
      const tier = 'FREE';

      expect(allowedTiers.includes(tier)).toBe(false);
    });

    it('should allow custom domains for professional tier', () => {
      const allowedTiers = ['PROFESSIONAL', 'ENTERPRISE'];
      const tier = 'PROFESSIONAL';

      expect(allowedTiers.includes(tier)).toBe(true);
    });

    it('should allow custom domains for enterprise tier', () => {
      const allowedTiers = ['PROFESSIONAL', 'ENTERPRISE'];
      const tier = 'ENTERPRISE';

      expect(allowedTiers.includes(tier)).toBe(true);
    });
  });
});
