"use client";

import React, { useState, useEffect } from "react";
import { resolveSignInEmail } from "@/actions/auth/resolve-sign-in-email";
import { sendSignInOtp } from "@/actions/auth/send-sign-in-otp";
import { authClient } from "@/lib/auth-client";
import { localeFromPathname, postLoginPath } from "@/lib/auth-post-login";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MailIcon } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Step = "email" | "otp";
type EmailAuthMode = "otp" | "password";

async function finishLogin() {
  const locale = localeFromPathname(window.location.pathname);
  const { data } = await authClient.getSession({
    fetchOptions: { cache: "no-store" },
  });
  const user = data?.user as { mustChangePassword?: boolean } | undefined;
  window.location.assign(postLoginPath(locale, user ?? {}));
}

export function LoginComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [emailAuthMode, setEmailAuthMode] = useState<EmailAuthMode>("password");
  const [email, setEmail] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => {
      setResendIn((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const sendOtp = async () => {
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await sendSignInOtp(email);
      if ("error" in result) {
        toast.error(result.error);
        if (result.retryAfterSeconds) setResendIn(result.retryAfterSeconds);
        return;
      }
      setAuthEmail(result.authEmail);
      setStep("otp");
      setResendIn(result.retryAfterSeconds);
      toast.success(
        step === "otp"
          ? "We sent the same code again. Check your inbox and spam folder."
          : "Verification code sent. Check your inbox and spam folder."
      );
    } catch {
      toast.error("Failed to send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithPassword = async () => {
    if (!email || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setIsLoading(true);
    try {
      const resolved = await resolveSignInEmail(email);
      if ("error" in resolved) {
        toast.error(resolved.error);
        return;
      }
      const { error } = await authClient.signIn.email({
        email: resolved.authEmail,
        password,
      });
      if (error) {
        toast.error(error.message || "Invalid email or password.");
        return;
      }
      toast.success("Login successful.");
      await finishLogin();
    } catch {
      toast.error("Sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit code.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email: (authEmail || email).trim().toLowerCase(),
        otp,
      });
      if (error) {
        toast.error(error.message || "Invalid or expired code.");
        return;
      }
      toast.success("Login successful.");
      await finishLogin();
    } catch (error) {
      toast.error("Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="my-5 w-full max-w-[336px] border-slate-800 bg-[#111827] text-white shadow-2xl">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl">
          {step === "otp" ? "Check your email" : "Login"}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {step === "otp"
            ? "Enter the code we sent you"
            : "Choose your sign-in method"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 pb-7">
        {step === "email" && (
          <div className="grid gap-3">
            <div className="flex gap-2 rounded-md bg-[#080e1c] p-1">
              <Button
                type="button"
                size="sm"
                variant={emailAuthMode === "password" ? "default" : "ghost"}
                className={
                  emailAuthMode === "password"
                    ? "flex-1"
                    : "flex-1 text-slate-300 hover:bg-slate-800 hover:text-white"
                }
                onClick={() => setEmailAuthMode("password")}
              >
                Password
              </Button>
              <Button
                type="button"
                size="sm"
                variant={emailAuthMode === "otp" ? "default" : "ghost"}
                className={
                  emailAuthMode === "otp"
                    ? "flex-1"
                    : "flex-1 text-slate-300 hover:bg-slate-800 hover:text-white"
                }
                onClick={() => setEmailAuthMode("otp")}
              >
                Email code
              </Button>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@gmail.com or you@company.com"
                className="border-slate-700 bg-[#080e1c] text-white placeholder:text-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (emailAuthMode === "password") signInWithPassword();
                    else sendOtp();
                  }
                }}
              />
            </div>
            {emailAuthMode === "password" ? (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="border-slate-700 bg-[#080e1c] text-white placeholder:text-slate-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    onKeyDown={(e) => e.key === "Enter" && signInWithPassword()}
                  />
                </div>
                <Button
                  className="bg-[#1784a5] text-slate-950 hover:bg-[#249bbd]"
                  onClick={signInWithPassword}
                  disabled={isLoading || !email || !password}
                >
                  Sign in with password
                </Button>
              </>
            ) : (
              <Button
                className="bg-[#1784a5] text-slate-950 hover:bg-[#249bbd]"
                onClick={sendOtp}
                disabled={isLoading || !email}
              >
                <MailIcon className="mr-2 h-4 w-4" />
                Send verification code
              </Button>
            )}
          </div>
        )}

        {step === "otp" && (
          <div className="grid gap-3">
            <p className="text-sm text-slate-300">
              Enter the 6-digit code sent to{" "}
              <strong className="text-white">{email}</strong>. It expires in
              10 minutes.
            </p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="border-slate-600 bg-[#080e1c] text-white"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              className="bg-[#1784a5] text-slate-950 hover:bg-[#249bbd]"
              onClick={verifyOtp}
              disabled={isLoading || otp.length !== 6}
            >
              Verify and sign in
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={sendOtp}
              disabled={isLoading || resendIn > 0}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => {
                setStep("email");
                setOtp("");
              }}
              disabled={isLoading}
            >
              Use a different email
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
