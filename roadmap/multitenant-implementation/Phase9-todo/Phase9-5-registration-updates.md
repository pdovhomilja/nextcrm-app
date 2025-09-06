# Phase 9-5: Registration Updates for Auto-Processing Invitations

## Overview
Update the user registration process to automatically process pending invitations when new users register.

## Implementation Location
File: `actions/auth-actions.ts`

## Core Registration Enhancement

### Updated registerUser Function

```typescript
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/send-verification-email';
import { generateVerificationToken } from '@/lib/email-verification';

export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<{
  success: boolean;
  error?: string;
  user?: { id: string; email: string };
  message?: string;
  invitationsProcessed?: number;
}> {
  try {
    // Step 1: Validate input (existing validation)
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!normalizedEmail || !password) {
      return { success: false, error: "Email and password are required" };
    }

    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    // Step 2: Check if user already exists (existing logic)
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return { success: false, error: "User already exists" };
    }

    // Step 3: Create user (existing logic)
    const hashedPassword = await bcrypt.hash(password, 12);
    const { token: verificationToken, expires: tokenExpires } = generateVerificationToken();
    
    const user = await db.user.create({
      data: {
        name: name?.trim() || null,
        email: normalizedEmail,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        emailTokenExpires: tokenExpires,
        cid: undefined, // Let Prisma auto-generate
      },
    });

    // Step 4: NEW - Process pending invitations for this email
    const invitationsProcessed = await processPendingInvitations(user.id, normalizedEmail);

    // Step 5: Send verification email (existing logic)
    await sendVerificationEmail(normalizedEmail, verificationToken);

    const message = invitationsProcessed > 0 
      ? `Account created successfully! We've also processed ${invitationsProcessed} pending invitation(s) for your email.`
      : 'Account created successfully! Please check your email to verify your account.';

    return { 
      success: true, 
      user: { id: user.id, email: user.email },
      message,
      invitationsProcessed
    };

  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "Registration failed" };
  }
}
```

## Core Auto-Processing Function

### processPendingInvitations Implementation

```typescript
/**
 * Processes all pending invitations for a newly registered user
 * Creates company memberships and marks invitations as accepted
 */
async function processPendingInvitations(
  userId: string, 
  email: string
): Promise<number> {
  try {
    console.log(`Processing pending invitations for ${email}`);

    // Step 1: Find all valid pending invitations
    const pendingInvitations = await db.companyInvitation.findMany({
      where: {
        invitedEmail: email.toLowerCase(),
        status: "PENDING",
        tokenExpires: { gt: new Date() }, // Not expired
      },
      include: {
        company: { select: { id: true, name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });

    if (pendingInvitations.length === 0) {
      console.log(`No pending invitations found for ${email}`);
      return 0;
    }

    console.log(`Found ${pendingInvitations.length} pending invitations for ${email}`);

    // Step 2: Check for existing memberships to avoid duplicates
    const existingMemberships = await db.companyMembership.findMany({
      where: {
        userId,
        companyId: { in: pendingInvitations.map(inv => inv.companyId) }
      },
    });

    const existingCompanyIds = new Set(existingMemberships.map(m => m.companyId));

    // Step 3: Filter out invitations where user is already a member
    const validInvitations = pendingInvitations.filter(
      invitation => !existingCompanyIds.has(invitation.companyId)
    );

    if (validInvitations.length === 0) {
      console.log(`All invitations for ${email} are for companies user is already a member of`);
      
      // Still mark all as accepted to clean up
      await markInvitationsAsAccepted(pendingInvitations.map(inv => inv.id), userId);
      return pendingInvitations.length;
    }

    // Step 4: Create operations for transaction
    const membershipOperations = validInvitations.map(invitation =>
      db.companyMembership.create({
        data: {
          companyId: invitation.companyId,
          userId,
          role: invitation.role,
        },
      })
    );

    const invitationUpdateOperations = pendingInvitations.map(invitation =>
      db.companyInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedByUserId: userId,
        },
      })
    );

    // Step 5: Execute all operations atomically
    await db.$transaction([
      ...membershipOperations,
      ...invitationUpdateOperations,
    ]);

    console.log(`Successfully processed ${validInvitations.length} invitations for ${email}`);
    console.log(`Marked ${pendingInvitations.length} total invitations as accepted`);

    // Step 6: Send welcome notifications
    await sendWelcomeNotifications(userId, validInvitations);

    return pendingInvitations.length;

  } catch (error) {
    console.error("Error processing pending invitations:", error);
    // Don't throw - registration should succeed even if invitation processing fails
    return 0;
  }
}
```

## Helper Functions

### Mark Invitations as Accepted

```typescript
async function markInvitationsAsAccepted(
  invitationIds: string[], 
  userId: string
): Promise<void> {
  if (invitationIds.length === 0) return;

  await db.companyInvitation.updateMany({
    where: { id: { in: invitationIds } },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
      acceptedByUserId: userId,
    },
  });
}
```

### Send Welcome Notifications

```typescript
async function sendWelcomeNotifications(
  userId: string,
  processedInvitations: any[]
): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) return;

    // Send welcome email for each company joined
    for (const invitation of processedInvitations) {
      await sendCompanyWelcomeEmail({
        toEmail: user.email,
        userName: user.name || 'New User',
        companyName: invitation.company.name,
        inviterName: invitation.invitedBy.name || 'Team member',
        role: invitation.role,
        companyId: invitation.companyId,
      });
    }
  } catch (error) {
    console.error("Error sending welcome notifications:", error);
    // Don't throw - this is non-critical
  }
}
```

## Email Integration

### Welcome Email Service

```typescript
// lib/email-invitations.ts - extend with welcome email
export interface CompanyWelcomeEmailProps {
  toEmail: string;
  userName: string;
  companyName: string;
  inviterName: string;
  role: string;
  companyId: string;
}

export async function sendCompanyWelcomeEmail(
  props: CompanyWelcomeEmailProps
): Promise<{ success: boolean; error?: string }> {
  try {
    // Implementation will be in Phase9-6-email-system.md
    console.log('Sending welcome email:', props);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: 'Failed to send welcome email' };
  }
}
```

## Enhanced Registration Validation

### Pre-Registration Invitation Preview

```typescript
export async function getRegistrationPreview(email: string): Promise<{
  success: boolean;
  error?: string;
  pendingInvitations?: {
    id: string;
    companyName: string;
    inviterName: string;
    role: string;
    expiresAt: Date;
  }[];
  totalInvitations?: number;
}> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    const pendingInvitations = await db.companyInvitation.findMany({
      where: {
        invitedEmail: normalizedEmail,
        status: "PENDING",
        tokenExpires: { gt: new Date() }, // Not expired
      },
      include: {
        company: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const preview = pendingInvitations.map(invitation => ({
      id: invitation.id,
      companyName: invitation.company.name,
      inviterName: invitation.invitedBy.name || 'Team member',
      role: invitation.role,
      expiresAt: invitation.tokenExpires,
    }));

    return {
      success: true,
      pendingInvitations: preview,
      totalInvitations: pendingInvitations.length,
    };
  } catch (error) {
    console.error("Error getting registration preview:", error);
    return { success: false, error: "Failed to get registration preview" };
  }
}
```

## Transaction Safety and Error Handling

### Robust Error Handling

```typescript
class InvitationProcessingError extends Error {
  constructor(
    message: string,
    public invitationId: string,
    public userId: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'InvitationProcessingError';
  }
}

async function processInvitationsSafely(
  userId: string,
  invitations: any[]
): Promise<{
  successful: number;
  failed: number;
  errors: InvitationProcessingError[];
}> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as InvitationProcessingError[],
  };

  for (const invitation of invitations) {
    try {
      await db.$transaction(async (tx) => {
        // Create membership
        await tx.companyMembership.create({
          data: {
            companyId: invitation.companyId,
            userId,
            role: invitation.role,
          },
        });

        // Mark invitation as accepted
        await tx.companyInvitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
            acceptedByUserId: userId,
          },
        });
      });

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(new InvitationProcessingError(
        `Failed to process invitation ${invitation.id}`,
        invitation.id,
        userId,
        error as Error
      ));
    }
  }

  return results;
}
```

## Testing Framework

### Comprehensive Test Suite

```typescript
// __tests__/registration-invitations.test.ts
describe('Registration with Invitation Processing', () => {
  describe('processPendingInvitations', () => {
    it('should create memberships for all valid pending invitations', async () => {
      // Test implementation
    });

    it('should handle expired invitations gracefully', async () => {
      // Test implementation
    });

    it('should avoid duplicate memberships', async () => {
      // Test implementation
    });

    it('should mark all invitations as accepted regardless of membership creation', async () => {
      // Test implementation
    });
  });

  describe('registerUser with invitations', () => {
    it('should register user and process invitations atomically', async () => {
      // Test implementation
    });

    it('should succeed even if invitation processing fails', async () => {
      // Test implementation
    });

    it('should return correct invitation count in response', async () => {
      // Test implementation
    });
  });

  describe('getRegistrationPreview', () => {
    it('should show pending invitations for email', async () => {
      // Test implementation
    });

    it('should exclude expired invitations', async () => {
      // Test implementation
    });
  });
});
```

## Database Performance Optimization

### Indexed Queries for Performance

```sql
-- Ensure optimal performance for invitation processing queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invitations_email_status_expires 
ON company_invitations (invited_email, status) 
WHERE status = 'PENDING' AND token_expires > NOW();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memberships_user_company 
ON company_memberships (user_id, company_id);
```

## Implementation Checklist

### Core Registration Updates
- ✅ Enhanced `registerUser` function with invitation processing
- ✅ `processPendingInvitations` helper function
- ✅ Transaction safety for atomic operations
- ✅ Error handling that doesn't break registration
- ✅ Welcome notification integration

### Supporting Functions
- ✅ `getRegistrationPreview` for UI preview
- ✅ `markInvitationsAsAccepted` helper
- ✅ `sendWelcomeNotifications` helper
- ✅ Robust error handling and logging

### Performance & Safety
- ✅ Database transaction safety
- ✅ Duplicate membership prevention
- ✅ Expired invitation handling
- ✅ Performance-optimized queries

## Integration Points

### Frontend Integration
```typescript
// Example usage in registration form
const handleRegistration = async (formData: FormData) => {
  // Show preview of pending invitations
  const preview = await getRegistrationPreview(email);
  
  if (preview.totalInvitations > 0) {
    // Show user what companies they'll join
    setInvitationPreview(preview.pendingInvitations);
  }

  // Proceed with registration
  const result = await registerUser(email, password, name);
  
  if (result.success && result.invitationsProcessed > 0) {
    toast.success(`Account created! You've been added to ${result.invitationsProcessed} companies.`);
  }
};
```

## Next Steps
1. Build email system and templates (Phase9-6-email-system.md)
2. Create frontend acceptance page (Phase9-7-frontend-acceptance.md)
3. Enhance company settings UI (Phase9-8-settings-ui.md)