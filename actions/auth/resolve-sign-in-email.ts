"use server";

import { resolveLoginIdentity } from "@/lib/auth-login-email";

export async function resolveSignInEmail(email: string) {
  return resolveLoginIdentity(email);
}
