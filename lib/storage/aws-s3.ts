/**
 * AWS S3 File Storage Service
 * Handles secure file uploads, downloads, and CloudFront CDN distribution
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface FileUploadOptions {
  contentType?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
}

interface StoredFile {
  id: string;
  key: string;
  fileName: string;
  size: number;
  mimeType: string;
  url: string;
  cdnUrl?: string;
  uploadedAt: Date;
}

export class S3Service {
  private s3Client: S3Client;
  private bucket = process.env.AWS_S3_BUCKET;
  private region = process.env.AWS_REGION;
  private cloudFrontUrl = process.env.AWS_CLOUDFRONT_URL;
  private uploadDir = process.env.AWS_S3_UPLOAD_DIR || 'uploads';

  constructor() {
    if (!this.isConfigured()) {
      throw new Error('AWS S3 is not configured');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  /**
   * Check if AWS S3 is configured
   */
  private isConfigured(): boolean {
    return (
      !!process.env.AWS_REGION &&
      !!process.env.AWS_S3_BUCKET &&
      !!process.env.AWS_ACCESS_KEY_ID &&
      !!process.env.AWS_SECRET_ACCESS_KEY
    );
  }

  /**
   * Upload file to S3
   */
  async uploadFile(
    tenantId: string,
    file: Buffer | string,
    fileName: string,
    options: FileUploadOptions = {}
  ): Promise<StoredFile> {
    try {
      const key = this.generateKey(tenantId, fileName);
      const contentType = options.contentType || 'application/octet-stream';

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        ContentDisposition:
          options.contentDisposition ||
          `attachment; filename="${fileName}"`,
        Metadata: options.metadata || {},
        ACL: options.isPublic ? 'public-read' : 'private',
      });

      await this.s3Client.send(command);

      // Get file size
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const headResponse = await this.s3Client.send(headCommand);
      const fileSize = headResponse.ContentLength || 0;

      // Generate URL
      const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      const cdnUrl = this.cloudFrontUrl ? `${this.cloudFrontUrl}/${key}` : undefined;

      // Store file metadata in database
      const stored = await prisma.file_Storage.create({
        data: {
          tenant_id: tenantId,
          file_name: fileName,
          s3_key: key,
          file_size: fileSize,
          mime_type: contentType,
          s3_url: s3Url,
          cdn_url: cdnUrl,
          is_public: options.isPublic || false,
        },
      });

      return {
        id: stored.id,
        key,
        fileName: stored.file_name,
        size: stored.file_size,
        mimeType: stored.mime_type,
        url: stored.s3_url,
        cdnUrl: stored.cdn_url || undefined,
        uploadedAt: stored.created_at,
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  /**
   * Download file from S3
   */
  async downloadFile(tenantId: string, fileId: string): Promise<Buffer> {
    try {
      // Get file metadata from database
      const file = await prisma.file_Storage.findUnique({
        where: { id: fileId },
      });

      if (!file || file.tenant_id !== tenantId) {
        throw new Error('File not found or access denied');
      }

      // Get file from S3
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: file.s3_key,
      });

      const response = await this.s3Client.send(command);

      // Convert stream to buffer
      if (!response.Body) {
        throw new Error('Failed to read file');
      }

      const buffer = await response.Body.transformToByteArray();
      return Buffer.from(buffer);
    } catch (error) {
      console.error('Error downloading file from S3:', error);
      throw error;
    }
  }

  /**
   * Get temporary signed URL for direct access
   */
  async getSignedDownloadUrl(
    tenantId: string,
    fileId: string,
    expirationHours = 24
  ): Promise<string> {
    try {
      // Get file metadata from database
      const file = await prisma.file_Storage.findUnique({
        where: { id: fileId },
      });

      if (!file || file.tenant_id !== tenantId) {
        throw new Error('File not found or access denied');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: file.s3_key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expirationHours * 60 * 60,
      });

      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(tenantId: string, fileId: string): Promise<void> {
    try {
      // Get file metadata from database
      const file = await prisma.file_Storage.findUnique({
        where: { id: fileId },
      });

      if (!file || file.tenant_id !== tenantId) {
        throw new Error('File not found or access denied');
      }

      // Delete from S3
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: file.s3_key,
      });

      await this.s3Client.send(command);

      // Delete from database
      await prisma.file_Storage.delete({
        where: { id: fileId },
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * List files for tenant
   */
  async listFiles(
    tenantId: string,
    limit = 50,
    offset = 0
  ): Promise<StoredFile[]> {
    try {
      const files = await prisma.file_Storage.findMany({
        where: { tenant_id: tenantId },
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
      });

      return files.map((f) => ({
        id: f.id,
        key: f.s3_key,
        fileName: f.file_name,
        size: f.file_size,
        mimeType: f.mime_type,
        url: f.s3_url,
        cdnUrl: f.cdn_url || undefined,
        uploadedAt: f.created_at,
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get file statistics for tenant
   */
  async getStorageStats(tenantId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
  }> {
    try {
      const files = await prisma.file_Storage.findMany({
        where: { tenant_id: tenantId },
        select: { file_size: true },
      });

      const totalFiles = files.length;
      const totalSize = files.reduce((sum, f) => sum + f.file_size, 0);
      const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;

      return {
        totalFiles,
        totalSize,
        averageFileSize,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      throw error;
    }
  }

  /**
   * Generate object key with tenant isolation
   */
  private generateKey(tenantId: string, fileName: string): string {
    const timestamp = Date.now();
    const hash = crypto.randomBytes(8).toString('hex');
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    return `${this.uploadDir}/${tenantId}/${timestamp}-${hash}-${cleanFileName}`;
  }

  /**
   * Validate file before upload
   */
  validateFile(
    file: Buffer,
    fileName: string,
    maxSizeMB = 100
  ): { valid: boolean; error?: string } {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.length > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds maximum of ${maxSizeMB}MB`,
      };
    }

    const allowedExtensions = [
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'jpg',
      'jpeg',
      'png',
      'gif',
      'zip',
    ];
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`,
      };
    }

    return { valid: true };
  }
}

export const s3Service = new S3Service();
