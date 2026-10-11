import { createAuthClient } from "better-auth/react";
import { emailOTPClient, adminClient } from "better-auth/client/plugins";
import { ac, admin, manager, user } from "@/lib/auth-permissions";
import { getAuthClientBaseURL } from "@/lib/auth-base-url";

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseURL(),
  plugins: [
    emailOTPClient(),
    adminClient({
      ac,
      roles: { admin, manager, user },
    }),
  ],
});

export const { signIn, signOut, useSession } = authClient;
