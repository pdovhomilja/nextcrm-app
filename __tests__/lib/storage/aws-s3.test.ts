/**
 * AWS S3 Service Tests
 */

import { S3Service } from '@/lib/storage/aws-s3';

describe('S3Service', () => {
  let service: S3Service;

  beforeEach(() => {
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_S3_BUCKET = 'test-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.AWS_CLOUDFRONT_URL = 'https://d123456.cloudfront.net';
  });

  describe('file validation', () => {
    it('should validate file size', () => {
      const largeBuffer = Buffer.alloc(150 * 1024 * 1024); // 150MB
      const result = service.validateFile(largeBuffer, 'test.pdf', 100);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should validate file extension', () => {
      const buffer = Buffer.from('test');
      const result = service.validateFile(buffer, 'test.exe', 100);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should allow valid file extensions', () => {
      const buffer = Buffer.from('test');
      const validExtensions = ['pdf', 'doc', 'docx', 'jpg', 'png', 'xlsx'];

      for (const ext of validExtensions) {
        const result = service.validateFile(buffer, `test.${ext}`, 100);
        expect(result.valid).toBe(true);
      }
    });

    it('should validate file size correctly', () => {
      const buffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      const result = service.validateFile(buffer, 'test.pdf', 100);

      expect(result.valid).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error if AWS credentials not configured', () => {
      delete process.env.AWS_ACCESS_KEY_ID;

      expect(() => {
        new S3Service();
      }).toThrow('AWS S3 is not configured');
    });

    it('should throw error if bucket not configured', () => {
      delete process.env.AWS_S3_BUCKET;

      expect(() => {
        new S3Service();
      }).toThrow('AWS S3 is not configured');
    });
  });

  describe('key generation', () => {
    it('should generate unique keys with tenant isolation', () => {
      const tenantId = 'tenant-123';
      const fileName = 'document.pdf';

      const key1 = service['generateKey'](tenantId, fileName);
      const key2 = service['generateKey'](tenantId, fileName);

      expect(key1).not.toBe(key2);
      expect(key1).toContain(`uploads/${tenantId}/`);
      expect(key1).toContain('document.pdf');
      expect(key2).toContain(`uploads/${tenantId}/`);
    });

    it('should sanitize file names', () => {
      const tenantId = 'tenant-123';
      const fileName = 'doc@#$%.pdf';

      const key = service['generateKey'](tenantId, fileName);

      expect(key).toContain('uploads/');
      // Special characters should be replaced with underscores
      expect(key).not.toContain('@');
      expect(key).not.toContain('#');
    });
  });
});
