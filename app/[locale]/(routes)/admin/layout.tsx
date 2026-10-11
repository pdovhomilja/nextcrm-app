import { redirect } from "next/navigation";
import { requireRole, AuthorizationError, AuthenticationError } from "@/lib/authz";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthenticationError) redirect("/sign-in");
    if (e instanceof AuthorizationError) redirect("/");
    throw e;
  }

  return <div className="w-full min-w-0">{children}</div>;
}
