import { redirect } from "next/navigation";

import { VenturesMasterGate } from "@/components/ventures/VenturesMasterGate";
import { getSession } from "@/lib/auth-server";
import { hasVenturesMasterSession } from "@/lib/ventures/ventures-master-session";

export default async function VenturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const role = session.user.role;
  if (role !== "admin" && role !== "manager") redirect("/");

  const unlocked = await hasVenturesMasterSession();
  if (!unlocked) {
    return <VenturesMasterGate />;
  }

  return children;
}
