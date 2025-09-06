# Phase 9-7: Frontend Invitation Acceptance Page

## Overview
Create comprehensive frontend components for invitation acceptance, including the acceptance page, validation, and user flow handling.

## Implementation Structure

```
app/
├── auth/
│   ├── accept-invitation/
│   │   ├── page.tsx              # Main acceptance page
│   │   └── loading.tsx           # Loading component
│   ├── signin/
│   │   └── page.tsx              # Enhanced signin with invitation context
│   └── register/
│       └── page.tsx              # Enhanced register with invitation preview
components/
├── auth/
│   ├── invitation-acceptance.tsx # Acceptance component
│   ├── invitation-preview.tsx    # Preview component
│   └── invitation-status.tsx     # Status display
└── ui/                          # shadcn/ui components
```

## Main Acceptance Page

### Accept Invitation Page Implementation

```tsx
// app/auth/accept-invitation/page.tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { checkInvitationStatus, acceptCompanyInvitation } from '@/actions/company-actions';
import { InvitationAcceptance } from '@/components/auth/invitation-acceptance';
import { InvitationStatus } from '@/components/auth/invitation-status';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface AcceptInvitationPageProps {
  searchParams: { 
    token?: string; 
    error?: string;
    success?: string;
  };
}

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const { token, error: urlError, success } = searchParams;
  
  // Handle missing token
  if (!token) {
    redirect('/auth/signin?error=' + encodeURIComponent('Invalid invitation link'));
  }

  // Check current authentication
  const session = await auth();
  
  // Get invitation status
  const invitationStatus = await checkInvitationStatus(token);
  
  if (!invitationStatus.success || !invitationStatus.invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              This invitation link is invalid or has expired.
            </p>
            <a 
              href="/auth/signin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Sign In
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invitation = invitationStatus.invitation;

  // Handle expired invitation
  if (invitation.isExpired || invitation.status !== 'PENDING') {
    return <InvitationStatus invitation={invitation} />;
  }

  // User not authenticated - redirect to sign in/register
  if (!session?.user) {
    const callbackUrl = `/auth/accept-invitation?token=${token}`;
    redirect(`/auth/signin?invitation_token=${token}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // User authenticated but wrong email
  if (session.user.email !== invitation.invitedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-900">Email Mismatch</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-2">
              This invitation is for <strong>{invitation.invitedEmail}</strong>
            </p>
            <p className="text-gray-600 mb-4">
              You're currently signed in as <strong>{session.user.email}</strong>
            </p>
            <div className="space-y-2">
              <a 
                href="/auth/signout"
                className="block w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Sign Out & Use Correct Email
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Process the invitation acceptance
  if (success !== 'true') {
    const result = await acceptCompanyInvitation(token);
    
    if (result.success && result.companyId) {
      redirect(`/${result.companyId}/dashboard?welcome=true&invited=true`);
    } else {
      redirect(`/auth/accept-invitation?token=${token}&error=${encodeURIComponent(result.error || 'Failed to accept invitation')}`);
    }
  }

  // Success state (shouldn't normally reach here due to redirect)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-900">Welcome to {invitation.companyName}!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">
            You've successfully joined the team.
          </p>
          <a 
            href={`/${urlError}/dashboard`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Go to Dashboard
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Loading Component

```tsx
// app/auth/accept-invitation/loading.tsx
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AcceptInvitationLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600">
            Processing your invitation...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Invitation Components

### Invitation Acceptance Component

```tsx
// components/auth/invitation-acceptance.tsx
'use client';

import { useState } from 'react';
import { acceptCompanyInvitation } from '@/actions/company-actions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, User, Calendar, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InvitationAcceptanceProps {
  invitation: {
    id: string;
    companyName: string;
    inviterName: string;
    role: string;
    expiresAt: Date;
    isExpired: boolean;
  };
  token: string;
}

export function InvitationAcceptance({ invitation, token }: InvitationAcceptanceProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const result = await acceptCompanyInvitation(token);
      
      if (result.success) {
        // Redirect to company dashboard
        window.location.href = `/${result.companyId}/dashboard?welcome=true&invited=true`;
      } else {
        setError(result.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsAccepting(false);
    }
  };

  const timeUntilExpiry = formatDistanceToNow(invitation.expiresAt, { addSuffix: true });
  const isExpiringSoon = invitation.expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Join {invitation.companyName}
          </CardTitle>
          <p className="text-gray-600">
            You've been invited to collaborate with the team
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isExpiringSoon && !invitation.isExpired && (
            <Alert variant="destructive">
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                This invitation expires {timeUntilExpiry}. Accept it soon!
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Invited by</span>
              </div>
              <span className="text-sm text-gray-900">{invitation.inviterName}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Role</span>
              </div>
              <Badge variant="outline" className="capitalize">
                {invitation.role.toLowerCase()}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Expires</span>
              </div>
              <span className="text-sm text-gray-900">{timeUntilExpiry}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What you'll get access to:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Project boards and task management</li>
              <li>• Team collaboration tools</li>
              <li>• AI-powered assistance</li>
              <li>• Real-time project analytics</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button 
            onClick={handleAccept}
            disabled={isAccepting || invitation.isExpired}
            className="w-full"
            size="lg"
          >
            {isAccepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invitation & Join Team'
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            By accepting, you agree to collaborate with {invitation.companyName} on TaskHQ
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
```

### Invitation Status Component

```tsx
// components/auth/invitation-status.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { XCircle, Clock, CheckCircle, Ban } from 'lucide-react';
import Link from 'next/link';

interface InvitationStatusProps {
  invitation: {
    id: string;
    companyName: string;
    inviterName: string;
    role: string;
    status: string;
    expiresAt: Date;
    isExpired: boolean;
  };
}

export function InvitationStatus({ invitation }: InvitationStatusProps) {
  const getStatusIcon = () => {
    switch (invitation.status) {
      case 'ACCEPTED':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'EXPIRED':
        return <Clock className="h-6 w-6 text-orange-600" />;
      case 'REVOKED':
        return <Ban className="h-6 w-6 text-red-600" />;
      default:
        return <XCircle className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (invitation.status) {
      case 'ACCEPTED':
        return 'bg-green-100';
      case 'EXPIRED':
        return 'bg-orange-100';
      case 'REVOKED':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusTitle = () => {
    switch (invitation.status) {
      case 'ACCEPTED':
        return 'Invitation Already Accepted';
      case 'EXPIRED':
        return 'Invitation Expired';
      case 'REVOKED':
        return 'Invitation Revoked';
      default:
        return 'Invitation Unavailable';
    }
  };

  const getStatusMessage = () => {
    switch (invitation.status) {
      case 'ACCEPTED':
        return `This invitation to ${invitation.companyName} has already been accepted.`;
      case 'EXPIRED':
        return `This invitation to ${invitation.companyName} expired on ${invitation.expiresAt.toLocaleDateString()}.`;
      case 'REVOKED':
        return `This invitation to ${invitation.companyName} has been cancelled.`;
      default:
        return `This invitation to ${invitation.companyName} is no longer valid.`;
    }
  };

  const getActionButton = () => {
    switch (invitation.status) {
      case 'ACCEPTED':
        return (
          <Button asChild className="w-full">
            <Link href="/auth/signin">Sign In to Access</Link>
          </Button>
        );
      case 'EXPIRED':
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 text-center">
              Contact {invitation.inviterName} for a new invitation
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/signin">Go to Sign In</Link>
            </Button>
          </div>
        );
      case 'REVOKED':
        return (
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/signin">Go to Sign In</Link>
          </Button>
        );
      default:
        return (
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/signin">Go to Sign In</Link>
          </Button>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${getStatusColor()}`}>
            {getStatusIcon()}
          </div>
          <CardTitle className="text-gray-900">
            {getStatusTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {getStatusMessage()}
          </p>
          
          {invitation.status === 'EXPIRED' && (
            <Alert>
              <AlertDescription>
                Ask {invitation.inviterName} to send you a new invitation to join {invitation.companyName}.
              </AlertDescription>
            </Alert>
          )}

          {getActionButton()}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Invitation Preview Component

```tsx
// components/auth/invitation-preview.tsx
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InvitationPreviewProps {
  invitations: Array<{
    id: string;
    companyName: string;
    inviterName: string;
    role: string;
    expiresAt: Date;
  }>;
}

export function InvitationPreview({ invitations }: InvitationPreviewProps) {
  if (invitations.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Pending Invitations ({invitations.length})
        </CardTitle>
        <p className="text-sm text-gray-600">
          You'll automatically join these companies when you register:
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invitation) => (
          <div 
            key={invitation.id}
            className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {invitation.companyName}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {invitation.inviterName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expires {formatDistanceToNow(invitation.expiresAt, { addSuffix: true })}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="capitalize">
              {invitation.role.toLowerCase()}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

## Enhanced Authentication Pages

### Enhanced Sign In Page

```tsx
// app/auth/signin/page.tsx (enhanced sections)
import { InvitationPreview } from '@/components/auth/invitation-preview';
import { checkInvitationStatus } from '@/actions/company-actions';

// Add to existing signin page
export default async function SignInPage({ searchParams }: { searchParams: any }) {
  const { invitation_token, error, callbackUrl } = searchParams;
  
  // Check invitation if token provided
  let invitationData = null;
  if (invitation_token) {
    const result = await checkInvitationStatus(invitation_token);
    if (result.success) {
      invitationData = result.invitation;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Show invitation context if present */}
        {invitationData && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-blue-600" />
                <h3 className="mt-2 text-lg font-medium text-blue-900">
                  Join {invitationData.companyName}
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  {invitationData.inviterName} invited you to join their team
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Existing sign in form */}
        {/* ... rest of sign in page implementation */}
      </div>
    </div>
  );
}
```

### Enhanced Register Page

```tsx
// app/auth/register/page.tsx (enhanced sections)
import { getRegistrationPreview } from '@/actions/auth-actions';
import { InvitationPreview } from '@/components/auth/invitation-preview';

// Add to existing register page
export default async function RegisterPage({ searchParams }: { searchParams: any }) {
  const { email } = searchParams;
  
  // Get invitation preview if email provided
  let invitationPreview = null;
  if (email) {
    const result = await getRegistrationPreview(email);
    if (result.success && result.pendingInvitations) {
      invitationPreview = result.pendingInvitations;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Show invitation preview */}
        {invitationPreview && invitationPreview.length > 0 && (
          <InvitationPreview invitations={invitationPreview} />
        )}
        
        {/* Existing registration form */}
        {/* ... rest of register page implementation */}
      </div>
    </div>
  );
}
```

## Client-Side Utilities

### Invitation URL Handling

```tsx
// lib/invitation-utils.ts
export function parseInvitationUrl(url: string): { token?: string; isValid: boolean } {
  try {
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    
    return {
      token: token || undefined,
      isValid: !!token && token.startsWith('inv_'),
    };
  } catch {
    return { isValid: false };
  }
}

export function createInvitationUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/auth/accept-invitation?token=${token}`;
}

export function createRegistrationUrl(baseUrl: string, email: string, invitationToken?: string): string {
  const params = new URLSearchParams({ email });
  if (invitationToken) {
    params.set('invitation_token', invitationToken);
  }
  return `${baseUrl}/auth/register?${params.toString()}`;
}
```

## Implementation Checklist

### Core Pages
- ✅ Accept invitation page with full validation
- ✅ Loading states and error handling
- ✅ Email mismatch detection and handling
- ✅ Redirect logic for authenticated/unauthenticated users

### Components
- ✅ Invitation acceptance component with rich UI
- ✅ Invitation status component for expired/revoked
- ✅ Invitation preview component for registration
- ✅ Loading and error states

### Enhanced Auth Pages  
- ✅ Sign-in page with invitation context
- ✅ Registration page with invitation preview
- ✅ Proper URL parameter handling
- ✅ Responsive design for all screen sizes

### Utilities
- ✅ URL parsing and generation utilities
- ✅ Client-side invitation handling
- ✅ Integration with server actions
- ✅ Error boundaries and fallbacks

## Next Steps
1. Create company settings UI (Phase9-8-settings-ui.md)
2. Implement security validation (Phase9-9-security-validation.md)
3. Build testing suite (Phase9-10-testing-suite.md)