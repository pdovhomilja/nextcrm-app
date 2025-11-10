import { Resend } from 'resend'
import { prismadb } from '@/lib/prisma'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailTemplateData {
  [key: string]: any
}

export class EmailService {
  /**
   * Send admin welcome email
   */
  static async sendAdminWelcomeEmail(
    email: string,
    data: {
      firstName: string
      temporaryPassword: string
      loginUrl: string
    }
  ) {
    const html = `
      <h1>Welcome to AutoCRM Admin Portal</h1>
      <p>Hi ${data.firstName},</p>
      <p>Your admin account has been created. Use the following credentials to log in:</p>
      <ul>
        <li>Email: <strong>${email}</strong></li>
        <li>Temporary Password: <strong>${data.temporaryPassword}</strong></li>
      </ul>
      <p>
        <a href="${data.loginUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 20px 0;">
          Log In Now
        </a>
      </p>
      <p><strong>Security Note:</strong> Please change your password immediately after logging in.</p>
      <p>Questions? Contact us at support@autocrm.com.au</p>
    `

    return this.sendEmail({
      to: email,
      subject: 'Welcome to AutoCRM Admin Portal',
      html
    })
  }

  /**
   * Send tenant welcome email
   */
  static async sendTenantWelcomeEmail(
    email: string,
    data: {
      firstName: string
      tenantName: string
      setupUrl: string
      subdomain: string
    }
  ) {
    const html = `
      <h1>Welcome to AutoCRM Pro!</h1>
      <p>Hi ${data.firstName},</p>
      <p>Your AutoCRM Pro account for ${data.tenantName} has been created successfully.</p>
      <p>Your workspace is now ready at: <strong>${data.subdomain}.autocrm.com.au</strong></p>
      <p>
        <a href="${data.setupUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 20px 0;">
          Complete Setup
        </a>
      </p>
      <p>Questions? Contact us at support@autocrm.com.au</p>
    `

    return this.sendEmail({
      to: email,
      subject: `Welcome to AutoCRM Pro - ${data.tenantName}`,
      html
    })
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    data: {
      firstName: string
      resetUrl: string
      expiresIn: string
    }
  ) {
    const html = `
      <h1>Password Reset Request</h1>
      <p>Hi ${data.firstName},</p>
      <p>We received a request to reset your password. Click the link below to proceed:</p>
      <p>
        <a href="${data.resetUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 20px 0;">
          Reset Password
        </a>
      </p>
      <p>This link expires in ${data.expiresIn}.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Questions? Contact us at support@autocrm.com.au</p>
    `

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html
    })
  }

  /**
   * Send trial expiry warning
   */
  static async sendTrialExpiryWarning(
    email: string,
    data: {
      firstName: string
      tenantName: string
      daysRemaining: number
      upgradeUrl: string
    }
  ) {
    const html = `
      <h1>Your Trial is Expiring Soon!</h1>
      <p>Hi ${data.firstName},</p>
      <p>Your AutoCRM Pro trial for ${data.tenantName} will expire in <strong>${data.daysRemaining} days</strong>.</p>
      <p>Continue enjoying AutoCRM Pro with a paid subscription:</p>
      <p>
        <a href="${data.upgradeUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 20px 0;">
          Upgrade Now
        </a>
      </p>
      <p>Questions? Contact us at support@autocrm.com.au</p>
    `

    return this.sendEmail({
      to: email,
      subject: `Your Trial Expires in ${data.daysRemaining} Days`,
      html
    })
  }

  /**
   * Send payment failed notification
   */
  static async sendPaymentFailedNotification(
    email: string,
    data: {
      firstName: string
      tenantName: string
      billingUrl: string
    }
  ) {
    const html = `
      <h1>Payment Failed</h1>
      <p>Hi ${data.firstName},</p>
      <p>We were unable to process your payment for ${data.tenantName}.</p>
      <p>
        <a href="${data.billingUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 20px 0;">
          Update Billing Information
        </a>
      </p>
      <p>Please update your billing information within 7 days to avoid service interruption.</p>
      <p>Questions? Contact us at support@autocrm.com.au</p>
    `

    return this.sendEmail({
      to: email,
      subject: 'Payment Failed - Action Required',
      html
    })
  }

  /**
   * Send support ticket confirmation
   */
  static async sendSupportTicketConfirmation(
    email: string,
    data: {
      ticketNumber: string
      subject: string
      ticketUrl: string
    }
  ) {
    const html = `
      <h1>Support Ticket Created</h1>
      <p>Thank you for contacting us.</p>
      <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
      <p><strong>Subject:</strong> ${data.subject}</p>
      <p>
        <a href="${data.ticketUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 20px 0;">
          View Ticket
        </a>
      </p>
      <p>We'll respond within 24 hours.</p>
      <p>Questions? Contact us at support@autocrm.com.au</p>
    `

    return this.sendEmail({
      to: email,
      subject: `Support Ticket #${data.ticketNumber} Created`,
      html
    })
  }

  /**
   * Send tenant suspended notification
   */
  static async sendTenantSuspendedNotification(
    email: string,
    data: {
      tenantName: string
      reason: string
      supportUrl: string
    }
  ) {
    const html = `
      <h1>Account Suspension Notice</h1>
      <p>Your AutoCRM Pro account for ${data.tenantName} has been suspended.</p>
      <p><strong>Reason:</strong> ${data.reason}</p>
      <p>
        <a href="${data.supportUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 20px 0;">
          Contact Support
        </a>
      </p>
      <p>For more information, please contact support@autocrm.com.au</p>
    `

    return this.sendEmail({
      to: email,
      subject: 'AutoCRM Account Suspended',
      html
    })
  }

  /**
   * Send invoice email
   */
  static async sendInvoiceEmail(
    email: string,
    data: {
      invoiceNumber: string
      amount: number
      currency: string
      invoiceUrl: string
    }
  ) {
    const html = `
      <h1>Your Invoice</h1>
      <p>Invoice #${data.invoiceNumber}</p>
      <p>Amount: <strong>${data.currency} ${data.amount}</strong></p>
      <p>
        <a href="${data.invoiceUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 20px 0;">
          Download Invoice
        </a>
      </p>
      <p>Questions? Contact us at support@autocrm.com.au</p>
    `

    return this.sendEmail({
      to: email,
      subject: `Invoice #${data.invoiceNumber}`,
      html
    })
  }

  /**
   * Generic email send
   */
  private static async sendEmail(options: {
    to: string
    subject: string
    html: string
  }) {
    try {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@autocrm.com.au',
        to: options.to,
        subject: options.subject,
        html: options.html
      })

      // Log email in database
      await prismadb.notificationLog.create({
        data: {
          recipientEmail: options.to,
          type: 'EMAIL',
          channel: 'RESEND',
          subject: options.subject,
          content: options.html,
          status: 'SENT',
          sentAt: new Date()
        }
      }).catch(err => console.error('Failed to log email:', err))

      return result
    } catch (error) {
      console.error('Failed to send email:', error)

      // Log failed email
      await prismadb.notificationLog.create({
        data: {
          recipientEmail: options.to,
          type: 'EMAIL',
          channel: 'RESEND',
          subject: options.subject,
          content: options.html,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      }).catch(err => console.error('Failed to log error:', err))

      throw error
    }
  }
}
