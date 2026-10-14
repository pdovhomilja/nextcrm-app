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

  let user: { email: string; userStatus: string | null } | null;
  try {
    user = await prismadb.users.findFirst({
      where: { OR: [{ email: typed }, { workEmail: typed }] },
      select: { email: true, userStatus: true },
    });
  } catch (error) {
    console.error("[resolveLoginIdentity] workEmail lookup failed, retrying email only", error);
    user = await prismadb.users.findFirst({
      where: { email: typed },
      select: { email: true, userStatus: true },
    });
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
