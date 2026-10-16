"use server";

import { resolveLoginIdentity } from "@/lib/auth-login-email";

export async function resolveSignInEmail(email: string) {
  try {
    return await resolveLoginIdentity(email);
  } catch (error) {
    console.error("[resolveSignInEmail] Uncaught error:", error);
    return {
      error: "Cannot connect to the database. Please make sure PostgreSQL or Supabase is connected in .env.",
    };
  }
}
