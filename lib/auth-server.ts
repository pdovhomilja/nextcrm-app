import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// TODO: Add requireRole() helper for viewer restriction enforcement
// when viewer role is first assigned to users

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
