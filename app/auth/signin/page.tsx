"use client";

import { useState, useTransition, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { registerUser, authenticateUser } from "@/actions/auth-actions";

import Link from "next/link";

function SignInForm() {
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  // Derive URL-based messages from searchParams (not from effect)
  const urlMessages = useMemo(() => {
    const verified = searchParams.get("verified");
    const errorParam = searchParams.get("error");

    if (verified === "true") {
      return { success: "Email verified successfully! You can now sign in.", error: "" };
    } else if (errorParam === "invalid-token") {
      return { success: "", error: "Invalid or expired verification token. Please try registering again." };
    } else if (errorParam === "missing-token") {
      return { success: "", error: "Verification token is missing." };
    }
    return { success: "", error: "" };
  }, [searchParams]);

  // Combined error and success (form state takes precedence over URL state)
  const error = formError || urlMessages.error;
  const success = formSuccess || urlMessages.success;

  const handleCredentialsSubmit = async (formData: FormData) => {
    setFormError("");
    setFormSuccess("");

    startTransition(async () => {
      try {
        if (isSignUp) {
          const result = await registerUser(formData);
          if (result.error) {
            setFormError(result.error);
          } else if (result.message) {
            setFormSuccess(result.message);
          }
          // Registration sends verification email, no auto sign-in
        } else {
          const result = await authenticateUser(formData);
          if (result?.error) {
            setFormError(result.error);
          }
          // If successful, authenticateUser will redirect automatically
        }
      } catch {
        setFormError("An unexpected error occurred");
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to TaskHQ
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Create your account"
              : "Sign in to access your dashboard"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={handleCredentialsSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? isSignUp
                  ? "Creating Account..."
                  : "Signing In..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFormError("");
                setFormSuccess("");
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Link href="/auth/sign-in-magic-link">
              <Button variant="default" className="w-full">
                Magic Link
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
}
