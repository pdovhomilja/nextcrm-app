# Phase 9-3: Enhanced Invitation Server Actions

## Overview
Implement the core `inviteUserToCompany` server action with dual-path logic to handle both registered and unregistered users.

## Implementation Location
File: `actions/company-actions.ts`

## Core Function: Enhanced inviteUserToCompany

### Function Signature
```typescript
export async function inviteUserToCompany(
  companyId: string,
  email: string,
  role: CompanyRole = "MEMBER",
): Promise<{
  success: boolean;
  error?: string;
  type?: "direct_membership" | "pending_invitation";
  membership?: any;
  invitation?: any;
}>
```

### Complete Implementation

```typescript
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { CompanyRole } from "@/lib/generated/prisma";
import { sendCompanyInvitationEmail } from "@/lib/email-invitations";

export async function inviteUserToCompany(
  companyId: string,
  email: string,
  role: CompanyRole = "MEMBER",
) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Step 1: Verify inviter has permissions
    const currentMembership = await db.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.user.id,
        },
      },
      include: { company: true },
    });

    if (
      !currentMembership ||
      !["ADMIN", "OWNER"].includes(currentMembership.role)
    ) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Step 2: Check if user is already registered
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // PATH A: User is registered - create direct membership
      return await handleRegisteredUserInvitation(
        existingUser,
        companyId,
        role,
        currentMembership.company.name,
        session.user.name || "Team member"
      );
    } else {
      // PATH B: User not registered - create pending invitation
      return await handleUnregisteredUserInvitation(
        email,
        companyId,
        role,
        session.user.id,
        currentMembership.company.name,
        session.user.name || "Team member"
      );
    }
  } catch (error) {
    console.error("Error inviting user:", error);
    return { success: false, error: "Failed to invite user" };
  }
}

// Helper function for registered users
async function handleRegisteredUserInvitation(
  existingUser: any,
  companyId: string,
  role: CompanyRole,
  companyName: string,
  inviterName: string
) {
  // Check if user is already a member
  const existingMembership = await db.companyMembership.findUnique({
    where: {
      companyId_userId: {
        companyId,
        userId: existingUser.id,
      },
    },
  });

  if (existingMembership) {
    return { success: false, error: "User is already a member" };
  }

  // Create direct membership
  const membership = await db.companyMembership.create({
    data: {
      companyId,
      userId: existingUser.id,
      role,
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      company: { select: { id: true, name: true } },
    },
  });

  // Send notification email to existing user
  await sendCompanyInvitationEmail({
    toEmail: existingUser.email,
    companyName,
    inviterName,
    type: "direct_add",
    companyId,
  });

  revalidatePath(`/${companyId}/settings`);
  return { 
    success: true, 
    type: "direct_membership" as const, 
    membership 
  };
}

// Helper function for unregistered users
async function handleUnregisteredUserInvitation(
  email: string,
  companyId: string,
  role: CompanyRole,
  inviterUserId: string,
  companyName: string,
  inviterName: string
) {
  // Check for existing pending invitation
  const existingInvitation = await db.companyInvitation.findUnique({
    where: {
      companyId_invitedEmail: {
        companyId,
        invitedEmail: email.toLowerCase(),
      },
    },
  });

  if (existingInvitation?.status === "PENDING") {
    return { success: false, error: "Invitation already sent to this email" };
  }

  // Create new invitation
  const invitation = await db.companyInvitation.create({
    data: {
      companyId,
      invitedEmail: email.toLowerCase(),
      invitedByUserId: inviterUserId,
      role,
      token: generateInvitationToken(),
      tokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    include: {
      company: { select: { id: true, name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });

  // Send invitation email
  await sendCompanyInvitationEmail({
    toEmail: email,
    companyName,
    inviterName,
    invitationToken: invitation.token,
    type: "pending_invitation",
    companyId,
  });

  revalidatePath(`/${companyId}/settings`);
  return { 
    success: true, 
    type: "pending_invitation" as const, 
    invitation 
  };
}

// Utility function for generating secure tokens
function generateInvitationToken(): string {
  // Using same pattern as Prisma's cuid() generation for consistency
  const crypto = require('crypto');
  return `inv_${crypto.randomBytes(16).toString('hex')}`;
}
```

## Token Generation Utility

### Secure Token Generation
```typescript
// lib/invitation-tokens.ts
import { customAlphabet } from 'nanoid';

// Create a custom alphabet excluding confusing characters
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 32);

export function generateInvitationToken(): string {
  return `inv_${nanoid()}`;
}

export function validateTokenFormat(token: string): boolean {
  return /^inv_[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz]{32}$/.test(token);
}
```

## Email Integration Points

### Email Service Integration
```typescript
// lib/email-invitations.ts - Interface definition
export interface InvitationEmailProps {
  toEmail: string;
  companyName: string;
  inviterName: string;
  type: 'pending_invitation' | 'direct_add';
  invitationToken?: string;
  companyId: string;
}

export async function sendCompanyInvitationEmail(props: InvitationEmailProps): Promise<{
  success: boolean;
  error?: string;
}> {
  // Implementation will be in Phase9-6-email-system.md
  console.log('Sending invitation email:', props);
  return { success: true };
}
```

## Error Handling Strategy

### Comprehensive Error Handling
```typescript
// Enhanced error handling for invitation process
export class InvitationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'InvitationError';
  }
}

export const InvitationErrorCodes = {
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  USER_ALREADY_MEMBER: 'USER_ALREADY_MEMBER',
  INVITATION_EXISTS: 'INVITATION_EXISTS',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_ROLE: 'INVALID_ROLE',
  COMPANY_NOT_FOUND: 'COMPANY_NOT_FOUND',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
} as const;
```

## Testing Framework

### Unit Tests Structure
```typescript
// __tests__/company-actions.test.ts
describe('inviteUserToCompany', () => {
  describe('Registered User Path', () => {
    it('should create direct membership for existing user', async () => {
      // Test implementation
    });

    it('should prevent duplicate membership', async () => {
      // Test implementation
    });

    it('should send direct_add email notification', async () => {
      // Test implementation
    });
  });

  describe('Unregistered User Path', () => {
    it('should create pending invitation for new user', async () => {
      // Test implementation
    });

    it('should prevent duplicate pending invitations', async () => {
      // Test implementation
    });

    it('should send pending_invitation email', async () => {
      // Test implementation
    });
  });

  describe('Permission Validation', () => {
    it('should reject invitations from non-admin users', async () => {
      // Test implementation
    });

    it('should allow ADMIN and OWNER roles to invite', async () => {
      // Test implementation
    });
  });
});
```

## Database Transaction Safety

### Atomic Operations
```typescript
// Example of transaction safety for critical operations
async function atomicInvitationCreation(invitationData: any) {
  return await db.$transaction(async (tx) => {
    // Check for existing invitation
    const existing = await tx.companyInvitation.findUnique({
      where: {
        companyId_invitedEmail: {
          companyId: invitationData.companyId,
          invitedEmail: invitationData.invitedEmail,
        },
      },
    });

    if (existing?.status === 'PENDING') {
      throw new InvitationError(
        'Invitation already exists',
        InvitationErrorCodes.INVITATION_EXISTS
      );
    }

    // Create the invitation
    return await tx.companyInvitation.create({
      data: invitationData,
      include: {
        company: { select: { id: true, name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });
  });
}
```

## Implementation Checklist

### Pre-Implementation
- ✅ Database migration completed (Phase9-1)
- ✅ Prisma schema updated (Phase9-2)
- ✅ Generated new Prisma client
- ✅ CompanyMembership model exists and working

### Implementation Steps
1. ✅ Create the enhanced `inviteUserToCompany` function
2. ✅ Implement registered user path (direct membership)
3. ✅ Implement unregistered user path (pending invitation)
4. ✅ Add secure token generation
5. ✅ Integrate email service placeholders
6. ✅ Add comprehensive error handling
7. ✅ Add transaction safety
8. ✅ Create unit test structure

### Post-Implementation Testing
```bash
# Test the action locally
pnpm test actions/company-actions

# Test with real database
pnpm dev
# Navigate to company settings and test invitation flow
```

## Next Steps
1. Create invitation management actions (Phase9-4-invitation-management.md)
2. Implement auto-processing for registration (Phase9-5-registration-updates.md)
3. Build email system (Phase9-6-email-system.md)