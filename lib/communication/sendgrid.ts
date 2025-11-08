/**
 * SendGrid Email Service
 * Provides transactional and marketing email capabilities
 */

import sgMail from '@sendgrid/mail';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EmailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
  }>;
}

interface BulkEmailData {
  to: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SendGridService {
  private fromEmail = process.env.SENDGRID_FROM_EMAIL;
  private fromName = process.env.SENDGRID_FROM_NAME || 'NextCRM';

  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is not configured');
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  /**
   * Send single email
   */
  async sendEmail(message: EmailMessage): Promise<SendResult> {
    try {
      const msg = {
        to: message.to,
        from: `${this.fromName} <${this.fromEmail}>`,
        subject: message.subject,
        html: message.html,
        text: message.text,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
        attachments: message.attachments,
      };

      const result = await sgMail.send(msg);

      return {
        success: true,
        messageId: result[0].headers['x-message-id'],
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email from template
   */
  async sendEmailFromTemplate(
    tenantId: string,
    templateId: string,
    to: string,
    data: Record<string, any>
  ): Promise<SendResult> {
    try {
      // Get template from database
      const template = await prisma.communication_Templates.findUnique({
        where: {
          id: templateId,
        },
      });

      if (!template) {
        return {
          success: false,
          error: 'Template not found',
        };
      }

      // Replace variables in template
      let html = template.template_html || '';
      let subject = template.template_subject || '';

      for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        html = html.replace(new RegExp(placeholder, 'g'), String(value));
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      }

      // Send email
      const result = await this.sendEmail({
        to,
        subject,
        html,
      });

      if (result.success) {
        // Log email send
        await this.logEmail(
          tenantId,
          templateId,
          to,
          'SENT',
          subject,
          true
        );
      } else {
        await this.logEmail(
          tenantId,
          templateId,
          to,
          'FAILED',
          subject,
          false,
          result.error
        );
      }

      return result;
    } catch (error) {
      console.error('Error sending email from template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk emails with personalization
   */
  async sendBulkEmails(
    tenantId: string,
    templateId: string,
    recipients: BulkEmailData[]
  ): Promise<{ success: number; failed: number; messageIds: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      messageIds: [] as string[],
    };

    for (const recipient of recipients) {
      const result = await this.sendEmailFromTemplate(
        tenantId,
        templateId,
        recipient.to,
        recipient
      );

      if (result.success && result.messageId) {
        results.success++;
        results.messageIds.push(result.messageId);
      } else {
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Create email template
   */
  async createTemplate(
    tenantId: string,
    name: string,
    subject: string,
    html: string,
    type: 'TRANSACTIONAL' | 'MARKETING'
  ): Promise<string> {
    try {
      const template = await prisma.communication_Templates.create({
        data: {
          tenant_id: tenantId,
          template_name: name,
          template_type: type,
          template_subject: subject,
          template_html: html,
          is_active: true,
        },
      });

      return template.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Get all templates for tenant
   */
  async getTemplates(
    tenantId: string,
    type?: 'TRANSACTIONAL' | 'MARKETING'
  ): Promise<
    Array<{
      id: string;
      name: string;
      type: string;
      subject: string;
      isActive: boolean;
    }>
  > {
    try {
      const templates = await prisma.communication_Templates.findMany({
        where: {
          tenant_id: tenantId,
          template_type: type,
        },
        select: {
          id: true,
          template_name: true,
          template_type: true,
          template_subject: true,
          is_active: true,
        },
      });

      return templates.map((t) => ({
        id: t.id,
        name: t.template_name,
        type: t.template_type,
        subject: t.template_subject,
        isActive: t.is_active,
      }));
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    updates: {
      name?: string;
      subject?: string;
      html?: string;
      isActive?: boolean;
    }
  ): Promise<void> {
    try {
      await prisma.communication_Templates.update({
        where: { id: templateId },
        data: {
          template_name: updates.name,
          template_subject: updates.subject,
          template_html: updates.html,
          is_active: updates.isActive,
        },
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await prisma.communication_Templates.delete({
        where: { id: templateId },
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Get email send history
   */
  async getEmailHistory(
    tenantId: string,
    limit = 50,
    offset = 0
  ): Promise<
    Array<{
      id: string;
      to: string;
      subject: string;
      status: string;
      sentAt: Date;
    }>
  > {
    try {
      const emails = await prisma.communication_Logs.findMany({
        where: {
          tenant_id: tenantId,
          communication_type: 'EMAIL',
        },
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
      });

      return emails.map((e) => ({
        id: e.id,
        to: e.recipient,
        subject: e.metadata?.subject || 'N/A',
        status: e.status,
        sentAt: e.created_at,
      }));
    } catch (error) {
      console.error('Error getting email history:', error);
      throw error;
    }
  }

  /**
   * Log email send
   */
  private async logEmail(
    tenantId: string,
    templateId: string,
    to: string,
    status: 'SENT' | 'FAILED',
    subject: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      await prisma.communication_Logs.create({
        data: {
          tenant_id: tenantId,
          communication_type: 'EMAIL',
          recipient: to,
          status,
          error_message: error,
          metadata: {
            templateId,
            subject,
          },
        },
      });
    } catch (err) {
      console.error('Error logging email:', err);
    }
  }
}

export const sendgridService = new SendGridService();
