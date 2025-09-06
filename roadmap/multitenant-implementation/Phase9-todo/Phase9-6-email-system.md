# Phase 9-6: Email System and Invitation Templates

## Overview
Build comprehensive email service with React Email templates for invitation notifications, welcome messages, and status updates.

## Implementation Files Structure

```
lib/
├── email-invitations.ts          # Main email service
├── email-templates/              # React Email templates
│   ├── pending-invitation.tsx    # For unregistered users
│   ├── direct-add.tsx            # For registered users
│   ├── company-welcome.tsx       # Registration welcome
│   └── invitation-reminder.tsx   # Reminder emails
└── email-utils.ts               # Email utilities
```

## Main Email Service

### Core Email Service Implementation

```typescript
// lib/email-invitations.ts
import { Resend } from 'resend';
import { 
  PendingInvitationEmail,
  DirectAddEmail,
  CompanyWelcomeEmail,
  InvitationReminderEmail 
} from './email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const EMAIL_CONFIG = {
  from: 'TaskHQ <pavel@endorphinit.com>',
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  replyTo: 'support@taskhq.xmation.ai',
} as const;

// Main invitation email interface
export interface InvitationEmailProps {
  toEmail: string;
  companyName: string;
  inviterName: string;
  type: 'pending_invitation' | 'direct_add';
  invitationToken?: string;
  companyId: string;
}

// Welcome email interface
export interface CompanyWelcomeEmailProps {
  toEmail: string;
  userName: string;
  companyName: string;
  inviterName: string;
  role: string;
  companyId: string;
}

// Reminder email interface
export interface InvitationReminderProps {
  toEmail: string;
  companyName: string;
  inviterName: string;
  invitationToken: string;
  expiresAt: Date;
  companyId: string;
}

/**
 * Send company invitation email (main function)
 */
export async function sendCompanyInvitationEmail({
  toEmail,
  companyName,
  inviterName,
  type,
  invitationToken,
  companyId,
}: InvitationEmailProps): Promise<{ success: boolean; error?: string }> {
  try {
    if (type === 'pending_invitation' && !invitationToken) {
      throw new Error('Invitation token required for pending invitations');
    }

    const subject = type === 'pending_invitation'
      ? `You're invited to join ${companyName} on TaskHQ`
      : `You've been added to ${companyName} on TaskHQ`;

    const emailTemplate = type === 'pending_invitation'
      ? PendingInvitationEmail({ 
          companyName, 
          inviterName, 
          invitationToken: invitationToken!,
          baseUrl: EMAIL_CONFIG.baseUrl,
        })
      : DirectAddEmail({ 
          companyName, 
          inviterName, 
          companyId,
          baseUrl: EMAIL_CONFIG.baseUrl,
        });

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [toEmail],
      subject,
      react: emailTemplate,
      replyTo: EMAIL_CONFIG.replyTo,
    });

    console.log(`Invitation email sent to ${toEmail}:`, result);
    return { success: true };

  } catch (error) {
    console.error('Error sending invitation email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send invitation email' 
    };
  }
}

/**
 * Send welcome email after registration with invitations processed
 */
export async function sendCompanyWelcomeEmail({
  toEmail,
  userName,
  companyName,
  inviterName,
  role,
  companyId,
}: CompanyWelcomeEmailProps): Promise<{ success: boolean; error?: string }> {
  try {
    const subject = `Welcome to ${companyName} on TaskHQ!`;

    const emailTemplate = CompanyWelcomeEmail({
      userName,
      companyName,
      inviterName,
      role,
      companyId,
      baseUrl: EMAIL_CONFIG.baseUrl,
    });

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [toEmail],
      subject,
      react: emailTemplate,
      replyTo: EMAIL_CONFIG.replyTo,
    });

    console.log(`Welcome email sent to ${toEmail}:`, result);
    return { success: true };

  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send welcome email' 
    };
  }
}

/**
 * Send invitation reminder before expiry
 */
export async function sendInvitationReminder({
  toEmail,
  companyName,
  inviterName,
  invitationToken,
  expiresAt,
  companyId,
}: InvitationReminderProps): Promise<{ success: boolean; error?: string }> {
  try {
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const subject = `Reminder: Your invitation to ${companyName} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`;

    const emailTemplate = InvitationReminderEmail({
      companyName,
      inviterName,
      invitationToken,
      expiresAt,
      daysUntilExpiry,
      baseUrl: EMAIL_CONFIG.baseUrl,
    });

    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [toEmail],
      subject,
      react: emailTemplate,
      replyTo: EMAIL_CONFIG.replyTo,
    });

    console.log(`Reminder email sent to ${toEmail}:`, result);
    return { success: true };

  } catch (error) {
    console.error('Error sending reminder email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send reminder email' 
    };
  }
}
```

## React Email Templates

### 1. Pending Invitation Template

```tsx
// lib/email-templates/pending-invitation.tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
  Hr,
  Img,
} from '@react-email/components';
import { emailStyles } from '../email-utils';

interface PendingInvitationEmailProps {
  companyName: string;
  inviterName: string;
  invitationToken: string;
  baseUrl: string;
}

export function PendingInvitationEmail({
  companyName = 'Your Company',
  inviterName = 'Team Member',
  invitationToken,
  baseUrl = 'http://localhost:3000',
}: PendingInvitationEmailProps) {
  const invitationUrl = `${baseUrl}/auth/accept-invitation?token=${invitationToken}`;
  
  return (
    <Html>
      <Head />
      <Preview>You&apos;re invited to join {companyName} on TaskHQ</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section style={emailStyles.header}>
            <Img
              src={`${baseUrl}/logo-email.png`}
              width="120"
              height="40"
              alt="TaskHQ"
              style={emailStyles.logo}
            />
          </Section>

          <Heading style={emailStyles.heading}>
            You&apos;re invited to join {companyName}
          </Heading>

          <Text style={emailStyles.text}>
            Hi there! 👋
          </Text>

          <Text style={emailStyles.text}>
            <strong>{inviterName}</strong> has invited you to join <strong>{companyName}</strong> on TaskHQ,
            a powerful project management platform designed to help teams collaborate effectively.
          </Text>

          <Text style={emailStyles.text}>
            To accept this invitation, click the button below. You&apos;ll need to create an account 
            if you don&apos;t have one already.
          </Text>

          <Section style={emailStyles.buttonContainer}>
            <Button style={emailStyles.primaryButton} href={invitationUrl}>
              Accept Invitation & Join Team
            </Button>
          </Section>

          <Text style={emailStyles.smallText}>
            If the button doesn&apos;t work, copy and paste this URL into your browser:
          </Text>
          <Text style={emailStyles.linkText}>{invitationUrl}</Text>

          <Hr style={emailStyles.divider} />

          <Section style={emailStyles.features}>
            <Text style={emailStyles.featuresTitle}>What you&apos;ll get with TaskHQ:</Text>
            <Text style={emailStyles.featureItem}>📋 Intuitive kanban boards</Text>
            <Text style={emailStyles.featureItem}>🤖 AI-powered task assistance</Text>
            <Text style={emailStyles.featureItem}>📊 Comprehensive analytics</Text>
            <Text style={emailStyles.featureItem}>🔒 Enterprise-grade security</Text>
          </Section>

          <Hr style={emailStyles.divider} />

          <Text style={emailStyles.footer}>
            This invitation will expire in 7 days. If you didn&apos;t expect this invitation, 
            you can safely ignore this email.
          </Text>

          <Text style={emailStyles.signature}>
            Best regards,<br />
            The TaskHQ Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PendingInvitationEmail;
```

### 2. Direct Add Template

```tsx
// lib/email-templates/direct-add.tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
  Hr,
  Img,
} from '@react-email/components';
import { emailStyles } from '../email-utils';

interface DirectAddEmailProps {
  companyName: string;
  inviterName: string;
  companyId: string;
  baseUrl: string;
}

export function DirectAddEmail({
  companyName = 'Your Company',
  inviterName = 'Team Member',
  companyId,
  baseUrl = 'http://localhost:3000',
}: DirectAddEmailProps) {
  const dashboardUrl = `${baseUrl}/${companyId}/dashboard`;
  
  return (
    <Html>
      <Head />
      <Preview>You&apos;ve been added to {companyName} on TaskHQ</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section style={emailStyles.header}>
            <Img
              src={`${baseUrl}/logo-email.png`}
              width="120"
              height="40"
              alt="TaskHQ"
              style={emailStyles.logo}
            />
          </Section>

          <Heading style={emailStyles.heading}>
            You&apos;ve been added to {companyName}! 🎉
          </Heading>

          <Text style={emailStyles.text}>
            Great news! <strong>{inviterName}</strong> has added you to <strong>{companyName}</strong> on TaskHQ.
          </Text>

          <Text style={emailStyles.text}>
            You can now access the company dashboard and start collaborating with your team immediately.
          </Text>

          <Section style={emailStyles.buttonContainer}>
            <Button style={emailStyles.primaryButton} href={dashboardUrl}>
              Go to Company Dashboard
            </Button>
          </Section>

          <Text style={emailStyles.smallText}>
            If the button doesn&apos;t work, copy and paste this URL into your browser:
          </Text>
          <Text style={emailStyles.linkText}>{dashboardUrl}</Text>

          <Hr style={emailStyles.divider} />

          <Section style={emailStyles.quickActions}>
            <Text style={emailStyles.featuresTitle}>Quick actions you can take:</Text>
            <Text style={emailStyles.featureItem}>
              📋 <a href={`${baseUrl}/${companyId}/tasks`} style={emailStyles.inlineLink}>
                View project boards
              </a>
            </Text>
            <Text style={emailStyles.featureItem}>
              ➕ <a href={`${baseUrl}/${companyId}/tasks?create=true`} style={emailStyles.inlineLink}>
                Create your first task
              </a>
            </Text>
            <Text style={emailStyles.featureItem}>
              🤖 <a href={`${baseUrl}/${companyId}/ai-assistant`} style={emailStyles.inlineLink}>
                Chat with AI assistant
              </a>
            </Text>
            <Text style={emailStyles.featureItem}>
              ⚙️ <a href={`${baseUrl}/${companyId}/settings`} style={emailStyles.inlineLink}>
                Update your profile
              </a>
            </Text>
          </Section>

          <Text style={emailStyles.footer}>
            If you have any questions, feel free to reach out to your team or contact our support.
          </Text>

          <Text style={emailStyles.signature}>
            Welcome aboard!<br />
            The TaskHQ Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default DirectAddEmail;
```

### 3. Company Welcome Template

```tsx
// lib/email-templates/company-welcome.tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
  Hr,
  Img,
} from '@react-email/components';
import { emailStyles } from '../email-utils';

interface CompanyWelcomeEmailProps {
  userName: string;
  companyName: string;
  inviterName: string;
  role: string;
  companyId: string;
  baseUrl: string;
}

export function CompanyWelcomeEmail({
  userName = 'New User',
  companyName = 'Your Company',
  inviterName = 'Team Member',
  role = 'Member',
  companyId,
  baseUrl = 'http://localhost:3000',
}: CompanyWelcomeEmailProps) {
  const dashboardUrl = `${baseUrl}/${companyId}/dashboard`;
  
  return (
    <Html>
      <Head />
      <Preview>Welcome to {companyName} on TaskHQ, {userName}!</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section style={emailStyles.header}>
            <Img
              src={`${baseUrl}/logo-email.png`}
              width="120"
              height="40"
              alt="TaskHQ"
              style={emailStyles.logo}
            />
          </Section>

          <Heading style={emailStyles.heading}>
            Welcome to {companyName}, {userName}! 🎉
          </Heading>

          <Text style={emailStyles.text}>
            Congratulations on successfully creating your TaskHQ account! 
          </Text>

          <Text style={emailStyles.text}>
            Thanks to <strong>{inviterName}</strong>&apos;s invitation, you&apos;ve been automatically 
            added to <strong>{companyName}</strong> with the role of <strong>{role}</strong>.
          </Text>

          <Text style={emailStyles.text}>
            Your account is now fully set up and ready to use. Let&apos;s get you started!
          </Text>

          <Section style={emailStyles.buttonContainer}>
            <Button style={emailStyles.primaryButton} href={dashboardUrl}>
              Start Exploring Your Dashboard
            </Button>
          </Section>

          <Hr style={emailStyles.divider} />

          <Section style={emailStyles.gettingStarted}>
            <Text style={emailStyles.featuresTitle}>Getting started is easy:</Text>
            
            <Text style={emailStyles.stepItem}>
              <strong>1. Explore your dashboard</strong><br />
              Get familiar with your project overview and team activity
            </Text>
            
            <Text style={emailStyles.stepItem}>
              <strong>2. Check out existing projects</strong><br />
              See what your team is working on and where you can contribute
            </Text>
            
            <Text style={emailStyles.stepItem}>
              <strong>3. Create your first task</strong><br />
              Start adding value by creating tasks or updating existing ones
            </Text>
            
            <Text style={emailStyles.stepItem}>
              <strong>4. Try our AI assistant</strong><br />
              Get help with project planning and task management
            </Text>
          </Section>

          <Hr style={emailStyles.divider} />

          <Section style={emailStyles.support}>
            <Text style={emailStyles.featuresTitle}>Need help?</Text>
            <Text style={emailStyles.text}>
              Our support team is here to help you get the most out of TaskHQ:
            </Text>
            <Text style={emailStyles.featureItem}>
              📖 <a href={`${baseUrl}/docs`} style={emailStyles.inlineLink}>
                Browse our documentation
              </a>
            </Text>
            <Text style={emailStyles.featureItem}>
              💬 <a href="mailto:support@taskhq.xmation.ai" style={emailStyles.inlineLink}>
                Contact support
              </a>
            </Text>
          </Section>

          <Text style={emailStyles.signature}>
            Happy collaborating!<br />
            The TaskHQ Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default CompanyWelcomeEmail;
```

### 4. Invitation Reminder Template

```tsx
// lib/email-templates/invitation-reminder.tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Section,
  Hr,
  Img,
} from '@react-email/components';
import { emailStyles } from '../email-utils';

interface InvitationReminderEmailProps {
  companyName: string;
  inviterName: string;
  invitationToken: string;
  expiresAt: Date;
  daysUntilExpiry: number;
  baseUrl: string;
}

export function InvitationReminderEmail({
  companyName = 'Your Company',
  inviterName = 'Team Member',
  invitationToken,
  expiresAt,
  daysUntilExpiry = 1,
  baseUrl = 'http://localhost:3000',
}: InvitationReminderEmailProps) {
  const invitationUrl = `${baseUrl}/auth/accept-invitation?token=${invitationToken}`;
  const urgencyLevel = daysUntilExpiry <= 1 ? 'urgent' : daysUntilExpiry <= 3 ? 'moderate' : 'gentle';
  
  return (
    <Html>
      <Head />
      <Preview>
        ⏰ Your invitation to {companyName} expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
      </Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section style={emailStyles.header}>
            <Img
              src={`${baseUrl}/logo-email.png`}
              width="120"
              height="40"
              alt="TaskHQ"
              style={emailStyles.logo}
            />
          </Section>

          <Section style={urgencyLevel === 'urgent' ? emailStyles.urgentBanner : emailStyles.reminderBanner}>
            <Text style={emailStyles.bannerText}>
              ⏰ {urgencyLevel === 'urgent' ? 'Urgent' : 'Reminder'}
            </Text>
          </Section>

          <Heading style={emailStyles.heading}>
            Don&apos;t miss out on joining {companyName}!
          </Heading>

          <Text style={emailStyles.text}>
            Hi there! This is a friendly reminder that <strong>{inviterName}</strong> invited you 
            to join <strong>{companyName}</strong> on TaskHQ.
          </Text>

          <Section style={urgencyLevel === 'urgent' ? emailStyles.urgentSection : emailStyles.reminderSection}>
            <Text style={emailStyles.emphasizedText}>
              {urgencyLevel === 'urgent' 
                ? `⚠️ Your invitation expires ${daysUntilExpiry === 0 ? 'today' : 'tomorrow'}!`
                : `You have ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} left to accept this invitation.`
              }
            </Text>
            <Text style={emailStyles.smallText}>
              Expires: {expiresAt.toLocaleDateString()} at {expiresAt.toLocaleTimeString()}
            </Text>
          </Section>

          <Text style={emailStyles.text}>
            Join your team today and start collaborating on exciting projects with TaskHQ&apos;s 
            powerful project management tools.
          </Text>

          <Section style={emailStyles.buttonContainer}>
            <Button 
              style={urgencyLevel === 'urgent' ? emailStyles.urgentButton : emailStyles.primaryButton} 
              href={invitationUrl}
            >
              {urgencyLevel === 'urgent' ? 'Accept Before It Expires!' : 'Accept Invitation Now'}
            </Button>
          </Section>

          <Text style={emailStyles.smallText}>
            If the button doesn&apos;t work, copy and paste this URL into your browser:
          </Text>
          <Text style={emailStyles.linkText}>{invitationUrl}</Text>

          <Hr style={emailStyles.divider} />

          <Text style={emailStyles.footer}>
            If you&apos;re no longer interested in joining {companyName}, you can safely ignore this email 
            and the invitation will expire automatically.
          </Text>

          <Text style={emailStyles.signature}>
            Best regards,<br />
            The TaskHQ Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default InvitationReminderEmail;
```

## Email Styling Utilities

### Centralized Email Styles

```typescript
// lib/email-utils.ts
export const emailStyles = {
  // Layout
  body: {
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
    backgroundColor: '#f6f9fc',
    margin: 0,
    padding: 0,
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px 0',
    marginBottom: '64px',
    maxWidth: '600px',
  },
  header: {
    padding: '20px 30px 0 30px',
    textAlign: 'center' as const,
  },
  logo: {
    margin: '0 auto',
  },

  // Typography
  heading: {
    fontSize: '24px',
    lineHeight: '1.3',
    fontWeight: '700',
    color: '#1f2937',
    padding: '0 30px',
    textAlign: 'center' as const,
    margin: '30px 0 20px 0',
  },
  text: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#374151',
    padding: '0 30px',
    margin: '0 0 16px 0',
  },
  smallText: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#6b7280',
    padding: '0 30px',
    margin: '12px 0',
  },
  emphasizedText: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#dc2626',
    fontWeight: '600',
    textAlign: 'center' as const,
    margin: '0 0 8px 0',
  },

  // Links and buttons
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    width: '280px',
    padding: '14px 20px',
    margin: '0 auto',
  },
  urgentButton: {
    backgroundColor: '#dc2626',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    width: '280px',
    padding: '14px 20px',
    margin: '0 auto',
  },
  buttonContainer: {
    padding: '20px 30px',
    textAlign: 'center' as const,
  },
  linkText: {
    fontSize: '14px',
    color: '#3b82f6',
    textDecoration: 'underline',
    padding: '0 30px',
    wordBreak: 'break-all' as const,
    margin: '8px 0',
  },
  inlineLink: {
    color: '#3b82f6',
    textDecoration: 'underline',
  },

  // Sections and features
  divider: {
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    margin: '32px 30px',
  },
  features: {
    padding: '0 30px 20px 30px',
  },
  featuresTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 16px 0',
  },
  featureItem: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
    margin: '0 0 8px 0',
  },
  stepItem: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#374151',
    margin: '0 0 16px 0',
  },

  // Special sections
  urgentBanner: {
    backgroundColor: '#fef2f2',
    border: '2px solid #fecaca',
    borderRadius: '8px',
    padding: '12px',
    margin: '20px 30px',
    textAlign: 'center' as const,
  },
  reminderBanner: {
    backgroundColor: '#eff6ff',
    border: '2px solid #bfdbfe',
    borderRadius: '8px',
    padding: '12px',
    margin: '20px 30px',
    textAlign: 'center' as const,
  },
  bannerText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#dc2626',
    margin: 0,
  },
  urgentSection: {
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    padding: '16px',
    margin: '20px 30px',
    textAlign: 'center' as const,
  },
  reminderSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '16px',
    margin: '20px 30px',
    textAlign: 'center' as const,
  },

  // Footer
  footer: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#6b7280',
    padding: '0 30px',
    margin: '20px 0',
    textAlign: 'center' as const,
  },
  signature: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#374151',
    padding: '0 30px',
    margin: '24px 0 0 0',
    textAlign: 'center' as const,
  },

  // Additional sections
  quickActions: {
    padding: '0 30px 20px 30px',
  },
  gettingStarted: {
    padding: '0 30px 20px 30px',
  },
  support: {
    padding: '0 30px 20px 30px',
  },
};

// Utility functions
export function formatExpiryDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getDaysUntilExpiry(expiresAt: Date): number {
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
```

## Email Service Testing

### Email Testing Framework

```typescript
// __tests__/email-service.test.ts
import { sendCompanyInvitationEmail, sendCompanyWelcomeEmail } from '@/lib/email-invitations';

describe('Email Service', () => {
  describe('sendCompanyInvitationEmail', () => {
    it('should send pending invitation email with token', async () => {
      const result = await sendCompanyInvitationEmail({
        toEmail: 'test@example.com',
        companyName: 'Test Company',
        inviterName: 'John Doe',
        type: 'pending_invitation',
        invitationToken: 'test_token_123',
        companyId: 'company_123',
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should send direct add email without token', async () => {
      const result = await sendCompanyInvitationEmail({
        toEmail: 'test@example.com',
        companyName: 'Test Company',
        inviterName: 'John Doe',
        type: 'direct_add',
        companyId: 'company_123',
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should require token for pending invitations', async () => {
      const result = await sendCompanyInvitationEmail({
        toEmail: 'test@example.com',
        companyName: 'Test Company',
        inviterName: 'John Doe',
        type: 'pending_invitation',
        companyId: 'company_123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('token required');
    });
  });
});
```

## Implementation Checklist

### Core Email Service
- ✅ Main invitation email function with dual path support
- ✅ Welcome email for registration with invitations
- ✅ Reminder email system for pending invitations
- ✅ Error handling and logging
- ✅ Configuration and environment support

### Email Templates
- ✅ Pending invitation template with clear CTA
- ✅ Direct add notification template
- ✅ Welcome email with onboarding guidance
- ✅ Reminder email with urgency levels
- ✅ Responsive email design
- ✅ Consistent branding and styling

### Supporting Infrastructure
- ✅ Centralized email styling system
- ✅ Utility functions for formatting
- ✅ Email testing framework
- ✅ Environment configuration
- ✅ Error handling and fallbacks

## Next Steps
1. Create frontend acceptance page (Phase9-7-frontend-acceptance.md)
2. Build company settings UI (Phase9-8-settings-ui.md)
3. Implement security validation (Phase9-9-security-validation.md)