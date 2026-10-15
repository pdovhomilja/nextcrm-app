import { prismadb } from "@/lib/prisma";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export type LoginIdentity =
  | { authEmail: string; deliverTo: string }
  | { error: string };

/**
 * Personal email is the account Better Auth knows. Work email is the company
 * mailbox on the same user. Either address may be typed at sign-in.
 */
export async function resolveLoginIdentity(rawEmail: string): Promise<LoginIdentity> {
  const typed = rawEmail.trim().toLowerCase();
  if (!isEmail(typed)) {
    return { error: "Enter a valid email address." };
  }

  let user: { email: string; userStatus: string | null } | null = null;
  try {
    try {
      user = await prismadb.users.findFirst({
        where: { OR: [{ email: typed }, { workEmail: typed }] },
        select: { email: true, userStatus: true },
      });
    } catch (workEmailError) {
      console.warn("[resolveLoginIdentity] workEmail lookup failed, retrying email only", workEmailError);
      user = await prismadb.users.findFirst({
        where: { email: typed },
        select: { email: true, userStatus: true },
      });
    }
  } catch (dbError) {
    console.error("[resolveLoginIdentity] Database connection failed:", dbError);
    return {
      error: "Cannot connect to the database. Please make sure PostgreSQL or Supabase is connected in .env.",
    };
  }

  if (!user?.email) {
    return {
      error: "No account uses this email. Sign in with your personal or work address.",
    };
  }

  if (user.userStatus === "INACTIVE") {
    return { error: "This account is inactive. Ask an admin to reactivate it." };
  }

  return { authEmail: user.email.trim().toLowerCase(), deliverTo: typed };
}
