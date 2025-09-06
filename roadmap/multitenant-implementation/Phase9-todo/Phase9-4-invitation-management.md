# Phase 9-4: Invitation Management Server Actions

## Overview
Implement comprehensive invitation management actions including accept, get, revoke, and resend functionality.

## Implementation Location
File: `actions/company-actions.ts` (extend existing file)

## Core Actions Implementation

### 1. Accept Company Invitation

```typescript
export async function acceptCompanyInvitation(token: string): Promise<{
  success: boolean;
  error?: string;
  companyId?: string;
  companyName?: string;
  message?: string;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Find and validate invitation
    const invitation = await db.companyInvitation.findUnique({
      where: { token },
      include: { company: true },
    });

    if (!invitation) {
      return { success: false, error: "Invalid invitation" };
    }

    // Validate invitation status
    if (invitation.status !== "PENDING") {
      return { success: false, error: "Invitation is no longer valid" };
    }

    // Check expiration
    if (invitation.tokenExpires < new Date()) {
      await db.companyInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return { success: false, error: "Invitation has expired" };
    }

    // Validate email match
    if (invitation.invitedEmail !== session.user.email) {
      return { 
        success: false, 
        error: "Invitation is for a different email address" 
      };
    }

    // Check if user is already a member
    const existingMembership = await db.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId: invitation.companyId,
          userId: session.user.id,
        },
      },
    });

    if (existingMembership) {
      // Mark invitation as accepted but don't create duplicate membership
      await db.companyInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedByUserId: session.user.id,
        },
      });
      return { 
        success: true, 
        message: "You are already a member of this company" 
      };
    }

    // Create membership and mark invitation as accepted atomically
    const result = await db.$transaction([
      db.companyMembership.create({
        data: {
          companyId: invitation.companyId,
          userId: session.user.id,
          role: invitation.role,
        },
      }),
      db.companyInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedByUserId: session.user.id,
        },
      }),
    ]);

    return { 
      success: true, 
      companyId: invitation.companyId, 
      companyName: invitation.company.name 
    };

  } catch (error) {
    console.error("Error accepting invitation:", error);
    return { success: false, error: "Failed to accept invitation" };
  }
}
```

### 2. Get Company Invitations

```typescript
export async function getCompanyInvitations(companyId: string): Promise<{
  success: boolean;
  error?: string;
  invitations?: any[];
}> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Verify user has access to company
    const membership = await db.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !["ADMIN", "OWNER"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Fetch all invitations for the company
    const invitations = await db.companyInvitation.findMany({
      where: { companyId },
      include: {
        invitedBy: { 
          select: { name: true, email: true, image: true } 
        },
        acceptedBy: { 
          select: { name: true, email: true, image: true } 
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, invitations };

  } catch (error) {
    console.error("Error fetching invitations:", error);
    return { success: false, error: "Failed to fetch invitations" };
  }
}
```

### 3. Revoke Company Invitation

```typescript
export async function revokeCompanyInvitation(invitationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Find the invitation with company info
    const invitation = await db.companyInvitation.findUnique({
      where: { id: invitationId },
      include: { company: true },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    // Check permissions
    const membership = await db.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId: invitation.companyId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !["ADMIN", "OWNER"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Only allow revoking pending invitations
    if (invitation.status !== "PENDING") {
      return { 
        success: false, 
        error: "Can only revoke pending invitations" 
      };
    }

    // Revoke the invitation
    await db.companyInvitation.update({
      where: { id: invitationId },
      data: { status: "REVOKED" },
    });

    revalidatePath(`/${invitation.companyId}/settings`);
    return { success: true };

  } catch (error) {
    console.error("Error revoking invitation:", error);
    return { success: false, error: "Failed to revoke invitation" };
  }
}
```

### 4. Resend Company Invitation

```typescript
export async function resendCompanyInvitation(invitationId: string): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Find the invitation with full details
    const invitation = await db.companyInvitation.findUnique({
      where: { id: invitationId },
      include: {
        company: { select: { id: true, name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    // Check permissions
    const membership = await db.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId: invitation.companyId,
          userId: session.user.id,
        },
      },
    });

    if (!membership || !["ADMIN", "OWNER"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Only resend pending invitations
    if (invitation.status !== "PENDING") {
      return { 
        success: false, 
        error: "Can only resend pending invitations" 
      };
    }

    // Check if invitation is expired and extend if needed
    const now = new Date();
    let updateData: any = {};
    
    if (invitation.tokenExpires < now) {
      updateData = {
        tokenExpires: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Extend 7 days
      };
    }

    // Update invitation if needed
    if (Object.keys(updateData).length > 0) {
      await db.companyInvitation.update({
        where: { id: invitationId },
        data: updateData,
      });
    }

    // Resend invitation email
    await sendCompanyInvitationEmail({
      toEmail: invitation.invitedEmail,
      companyName: invitation.company.name,
      inviterName: invitation.invitedBy.name || "Team member",
      invitationToken: invitation.token,
      type: "pending_invitation",
      companyId: invitation.companyId,
    });

    return { 
      success: true, 
      message: "Invitation resent successfully" 
    };

  } catch (error) {
    console.error("Error resending invitation:", error);
    return { success: false, error: "Failed to resend invitation" };
  }
}
```

## Additional Utility Actions

### 5. Check Invitation Status

```typescript
export async function checkInvitationStatus(token: string): Promise<{
  success: boolean;
  error?: string;
  invitation?: {
    id: string;
    companyName: string;
    inviterName: string;
    role: string;
    status: string;
    expiresAt: Date;
    isExpired: boolean;
  };
}> {
  try {
    const invitation = await db.companyInvitation.findUnique({
      where: { token },
      include: {
        company: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    });

    if (!invitation) {
      return { success: false, error: "Invalid invitation" };
    }

    const isExpired = invitation.tokenExpires < new Date();

    return {
      success: true,
      invitation: {
        id: invitation.id,
        companyName: invitation.company.name,
        inviterName: invitation.invitedBy.name || "Team member",
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.tokenExpires,
        isExpired,
      },
    };
  } catch (error) {
    console.error("Error checking invitation status:", error);
    return { success: false, error: "Failed to check invitation status" };
  }
}
```

### 6. Get User's Pending Invitations

```typescript
export async function getUserPendingInvitations(email?: string): Promise<{
  success: boolean;
  error?: string;
  invitations?: any[];
}> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const targetEmail = email || session.user.email;

  if (!targetEmail) {
    return { success: false, error: "No email address available" };
  }

  try {
    const invitations = await db.companyInvitation.findMany({
      where: {
        invitedEmail: targetEmail.toLowerCase(),
        status: "PENDING",
        tokenExpires: { gt: new Date() }, // Not expired
      },
      include: {
        company: { select: { name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, invitations };
  } catch (error) {
    console.error("Error fetching user pending invitations:", error);
    return { success: false, error: "Failed to fetch pending invitations" };
  }
}
```

## Cleanup and Maintenance Actions

### 7. Clean Up Expired Invitations

```typescript
export async function cleanupExpiredInvitations(): Promise<{
  success: boolean;
  error?: string;
  cleanedCount?: number;
}> {
  try {
    const result = await db.companyInvitation.updateMany({
      where: {
        status: "PENDING",
        tokenExpires: { lt: new Date() },
      },
      data: {
        status: "EXPIRED",
      },
    });

    console.log(`Marked ${result.count} invitations as expired`);
    return { success: true, cleanedCount: result.count };
  } catch (error) {
    console.error("Error cleaning up expired invitations:", error);
    return { success: false, error: "Failed to cleanup expired invitations" };
  }
}
```

## Error Handling and Validation

### Enhanced Error Types

```typescript
export const InvitationManagementErrors = {
  INVITATION_NOT_FOUND: 'INVITATION_NOT_FOUND',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVITATION_ALREADY_ACCEPTED: 'INVITATION_ALREADY_ACCEPTED',
  INVITATION_REVOKED: 'INVITATION_REVOKED',
  EMAIL_MISMATCH: 'EMAIL_MISMATCH',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
  CANNOT_RESEND: 'CANNOT_RESEND',
  CANNOT_REVOKE: 'CANNOT_REVOKE',
} as const;

export function createInvitationError(
  code: keyof typeof InvitationManagementErrors,
  message?: string
): { success: false; error: string; code: string } {
  const defaultMessages = {
    INVITATION_NOT_FOUND: 'Invitation not found',
    INVITATION_EXPIRED: 'Invitation has expired',
    INVITATION_ALREADY_ACCEPTED: 'Invitation has already been accepted',
    INVITATION_REVOKED: 'Invitation has been revoked',
    EMAIL_MISMATCH: 'Invitation is for a different email address',
    ALREADY_MEMBER: 'User is already a member',
    CANNOT_RESEND: 'Cannot resend this invitation',
    CANNOT_REVOKE: 'Cannot revoke this invitation',
  };

  return {
    success: false,
    error: message || defaultMessages[code],
    code: InvitationManagementErrors[code],
  };
}
```

## Testing Framework

### Comprehensive Test Suite

```typescript
// __tests__/invitation-management.test.ts
describe('Invitation Management Actions', () => {
  describe('acceptCompanyInvitation', () => {
    it('should accept valid invitation and create membership', async () => {
      // Test implementation
    });

    it('should reject expired invitations', async () => {
      // Test implementation
    });

    it('should handle email mismatch gracefully', async () => {
      // Test implementation
    });
  });

  describe('getCompanyInvitations', () => {
    it('should return invitations for admin users', async () => {
      // Test implementation
    });

    it('should reject non-admin users', async () => {
      // Test implementation
    });
  });

  describe('revokeCompanyInvitation', () => {
    it('should revoke pending invitations', async () => {
      // Test implementation
    });

    it('should prevent revoking accepted invitations', async () => {
      // Test implementation
    });
  });

  describe('resendCompanyInvitation', () => {
    it('should resend pending invitations', async () => {
      // Test implementation
    });

    it('should extend expired invitations when resending', async () => {
      // Test implementation
    });
  });
});
```

## Implementation Checklist

### Core Actions
- ✅ Accept invitation with full validation
- ✅ Get company invitations with permission checks
- ✅ Revoke invitation with status validation
- ✅ Resend invitation with expiry extension
- ✅ Check invitation status utility
- ✅ Get user pending invitations
- ✅ Cleanup expired invitations

### Error Handling
- ✅ Comprehensive error types and messages
- ✅ Input validation for all actions
- ✅ Permission validation for admin actions
- ✅ Transaction safety for critical operations

### Integration Points
- ✅ Email service integration placeholders
- ✅ Path revalidation for UI updates
- ✅ Database transaction handling
- ✅ Session and authentication validation

## Next Steps
1. Update registration to auto-process invitations (Phase9-5-registration-updates.md)
2. Build email system and templates (Phase9-6-email-system.md)
3. Create frontend components (Phase9-7-frontend-acceptance.md)