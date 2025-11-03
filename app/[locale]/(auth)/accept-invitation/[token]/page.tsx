"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { acceptInvitation } from "@/actions/organization/accept-invitation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getRoleDisplayName } from "@/lib/permissions";
import { prismadb } from "@/lib/prisma";

interface AcceptInvitationPageProps {
  params: Promise<{
    token: string;
  }>;
}

interface InvitationInfo {
  organizationName: string;
  role: string;
  email: string;
  invitedByName: string;
}

export default function AcceptInvitationPage({
  params,
}: AcceptInvitationPageProps) {
  const { token } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);

  useEffect(() => {
    const loadInvitationInfo = async () => {
      try {
        setLoading(true);
        // We need to call a server action to get invitation info
        // For now, we'll handle this in the accept flow
      } catch (err) {
        setError("Failed to load invitation details");
      } finally {
        setLoading(false);
      }
    };

    loadInvitationInfo();
  }, [token]);

  const handleAccept = async () => {
    if (status !== "authenticated" || !session?.user?.email) {
      // Redirect to sign in with callback
      router.push(`/sign-in?callback=/auth/accept-invitation/${token}`);
      return;
    }

    try {
      setAccepting(true);
      setError(null);

      const result = await acceptInvitation(token);

      if (result.success) {
        setSuccess(true);
        // Redirect to organization after 2 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground mb-4" />
            <CardTitle>Processing Invitation</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-md border-green-200 dark:border-green-800">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <CardTitle>Invitation Accepted!</CardTitle>
            <CardDescription>
              You have successfully joined the organization. Redirecting...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Team Invitation</CardTitle>
          <CardDescription>
            {status === "authenticated"
              ? `You are signed in as ${session?.user?.email}`
              : "Please sign in to accept this invitation"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Error</p>
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Invitation Details:</strong>
              </p>
              <ul className="text-xs text-blue-600 dark:text-blue-400 mt-3 space-y-2">
                <li>
                  This is a one-time token that expires in 7 days
                </li>
                <li>
                  Once accepted, you&apos;ll be added to the organization
                </li>
                <li>
                  Your role and permissions will be set by the organization owner
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            {status === "authenticated" ? (
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full"
                size="lg"
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
            ) : (
              <Button
                onClick={() => router.push(`/sign-in?callback=/auth/accept-invitation/${token}`)}
                className="w-full"
                size="lg"
              >
                Sign In to Accept
              </Button>
            )}

            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full"
            >
              Go Home
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            By accepting this invitation, you agree to join the organization and follow its policies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
