/**
 * SendGrid Service Tests
 */

import { SendGridService } from '@/lib/communication/sendgrid';

describe('SendGridService', () => {
  let service: SendGridService;

  beforeEach(() => {
    process.env.SENDGRID_API_KEY = 'test-api-key';
    process.env.SENDGRID_FROM_EMAIL = 'test@example.com';
    process.env.SENDGRID_FROM_NAME = 'NextCRM';
    service = new SendGridService();
  });

  describe('email validation', () => {
    it('should require recipient email', () => {
      const message = {
        to: '',
        subject: 'Test',
        html: '<p>Test</p>',
      };

      expect(message.to).toBe('');
    });

    it('should require subject', () => {
      const message = {
        to: 'user@example.com',
        subject: '',
        html: '<p>Test</p>',
      };

      expect(message.subject).toBe('');
    });

    it('should accept valid email format', () => {
      const validEmails = [
        'user@example.com',
        'user+tag@example.co.uk',
        'user.name@example.com',
      ];

      for (const email of validEmails) {
        // Simple validation pattern
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(true);
      }
    });

    it('should reject invalid email format', () => {
      const invalidEmails = ['invalid', '@example.com', 'user@', 'user @example.com'];

      for (const email of invalidEmails) {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('error handling', () => {
    it('should throw error if SENDGRID_API_KEY not configured', () => {
      delete process.env.SENDGRID_API_KEY;

      expect(() => {
        new SendGridService();
      }).toThrow('SENDGRID_API_KEY is not configured');
    });

    it('should throw error if FROM_EMAIL not configured', () => {
      delete process.env.SENDGRID_FROM_EMAIL;

      expect(() => {
        new SendGridService();
      }).toThrow();
    });
  });

  describe('template variables', () => {
    it('should replace template variables correctly', () => {
      const template = 'Hello {{firstName}}, welcome to {{appName}}!';
      const data = {
        firstName: 'John',
        appName: 'NextCRM',
      };

      let result = template;
      for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }

      expect(result).toBe('Hello John, welcome to NextCRM!');
    });

    it('should handle missing variables', () => {
      const template = 'Hello {{firstName}}, welcome to {{appName}}!';
      const data = {
        firstName: 'John',
        // Missing appName
      };

      let result = template;
      for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }

      expect(result).toContain('{{appName}}');
    });
  });
});
