# Phase 9-2: Prisma Schema Updates for Company Invitations

## Overview
Update the Prisma schema to include the new CompanyInvitation model and establish proper relations.

## Schema Changes Required

### 1. Add InvitationStatus Enum
```prisma
enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}
```

### 2. Create CompanyInvitation Model
```prisma
model CompanyInvitation {
  id                String            @id @default(cuid())
  companyId         String
  company           Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  invitedEmail      String
  invitedByUserId   String
  invitedBy         User              @relation("SentInvitations", fields: [invitedByUserId], references: [id])
  role              CompanyRole       @default(MEMBER)
  status            InvitationStatus  @default(PENDING)
  token             String            @unique @default(cuid())
  tokenExpires      DateTime          // 7 days from creation
  acceptedAt        DateTime?
  acceptedByUserId  String?
  acceptedBy        User?             @relation("AcceptedInvitations", fields: [acceptedByUserId], references: [id])
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@unique([companyId, invitedEmail])
  @@index([token])
  @@index([invitedEmail])
  @@index([companyId, status])
  @@map("company_invitations")
}
```

### 3. Update User Model Relations
Add the following relations to the existing User model:
```prisma
model User {
  // ... existing fields

  // Add invitation relations
  sentInvitations     CompanyInvitation[] @relation("SentInvitations")
  acceptedInvitations CompanyInvitation[] @relation("AcceptedInvitations")
}
```

### 4. Update Company Model Relations
Add the following relation to the existing Company model:
```prisma
model Company {
  // ... existing fields

  // Add invitation relation
  invitations CompanyInvitation[]
}
```

## Complete Updated Schema Section

### Required Enums
```prisma
enum CompanyRole {
  MEMBER
  ADMIN
  OWNER
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}
```

### Models with Relations
```prisma
model User {
  id                      String    @id @default(cuid())
  name                    String?
  email                   String    @unique
  emailVerified           DateTime? @map("email_verified")
  emailVerificationToken  String?   @unique @map("email_verification_token")
  emailTokenExpires       DateTime? @map("email_token_expires")
  image                   String?
  password                String?
  cid                     String?   @default(cuid()) @map("company_id")
  role                    UserRole  @default(USER)
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")

  // Existing relations
  accounts      Account[]
  sessions      Session[]
  assignedTasks Task[]    @relation("AssignedTasks")
  createdTasks  Task[]    @relation("CreatedTasks")

  // NEW: Add invitation relations
  sentInvitations     CompanyInvitation[] @relation("SentInvitations")
  acceptedInvitations CompanyInvitation[] @relation("AcceptedInvitations")

  @@index([cid])
  @@index([emailVerificationToken])
  @@map("users")
}

model Company {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Existing relations
  boards Board[]

  // NEW: Add invitation relation
  invitations CompanyInvitation[]

  @@map("companies")
}

model CompanyInvitation {
  id                String            @id @default(cuid())
  companyId         String
  company           Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  invitedEmail      String
  invitedByUserId   String
  invitedBy         User              @relation("SentInvitations", fields: [invitedByUserId], references: [id])
  role              CompanyRole       @default(MEMBER)
  status            InvitationStatus  @default(PENDING)
  token             String            @unique @default(cuid())
  tokenExpires      DateTime          // 7 days from creation
  acceptedAt        DateTime?
  acceptedByUserId  String?
  acceptedBy        User?             @relation("AcceptedInvitations", fields: [acceptedByUserId], references: [id])
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  @@unique([companyId, invitedEmail])
  @@index([token])
  @@index([invitedEmail])
  @@index([companyId, status])
  @@map("company_invitations")
}
```

## Implementation Steps

### Step 1: Update Prisma Schema File
Edit `prisma/schema.prisma`:
```bash
# Open the schema file
code prisma/schema.prisma
```

### Step 2: Add the Enum
Add the `InvitationStatus` enum near other enums in the schema.

### Step 3: Add the Model
Add the complete `CompanyInvitation` model to the schema.

### Step 4: Update Existing Models
Add the invitation relations to both `User` and `Company` models.

### Step 5: Generate Updated Client
```bash
# Generate the updated Prisma client with new types
npx prisma generate
```

### Step 6: Validate Schema
```bash
# Validate the schema is correct
npx prisma validate

# Format the schema
npx prisma format
```

## Type Safety Verification

After updating the schema, these TypeScript types will be available:

```typescript
// Import types from the generated client
import { 
  CompanyInvitation, 
  InvitationStatus, 
  CompanyRole,
  Prisma 
} from '@/lib/generated/prisma';

// Example usage with proper typing
type InvitationWithRelations = Prisma.CompanyInvitationGetPayload<{
  include: {
    company: { select: { id: true, name: true } },
    invitedBy: { select: { name: true, email: true } },
    acceptedBy: { select: { name: true, email: true } }
  }
}>;

// Status checking with type safety
const isPending = (status: InvitationStatus): boolean => {
  return status === 'PENDING';
};

// Role validation with type safety
const isValidRole = (role: CompanyRole): boolean => {
  return ['MEMBER', 'ADMIN', 'OWNER'].includes(role);
};
```

## Database Queries Examples

Test queries to verify the schema works:

```typescript
// Find all pending invitations for a company
const pendingInvitations = await db.companyInvitation.findMany({
  where: {
    companyId: 'company_123',
    status: 'PENDING',
  },
  include: {
    invitedBy: { select: { name: true, email: true } },
    company: { select: { name: true } }
  }
});

// Find invitation by token
const invitation = await db.companyInvitation.findUnique({
  where: { token: 'invitation_token_123' },
  include: {
    company: true,
    invitedBy: true
  }
});

// Get user's sent invitations
const userInvitations = await db.user.findUnique({
  where: { id: 'user_123' },
  include: {
    sentInvitations: {
      include: { company: true }
    }
  }
});
```

## Validation Checklist

After schema update:
- ✅ `npx prisma validate` passes
- ✅ `npx prisma generate` completes successfully
- ✅ TypeScript compilation passes
- ✅ All existing queries still work
- ✅ New invitation types are available in IDE autocomplete

## Next Steps
1. Implement enhanced invitation server actions (Phase9-3-invitation-actions.md)
2. Create invitation management actions (Phase9-4-invitation-management.md)