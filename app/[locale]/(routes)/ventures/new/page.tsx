import { redirect } from "next/navigation";

import { VentureCreateForm } from "@/components/ventures/VentureCreateForm";
import Container from "../../components/ui/Container";
import { getSession } from "@/lib/auth-server";

export default async function NewVenturePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.role !== "admin") redirect("/ventures");

  return (
    <Container
      title="New venture"
      description="Register another connected application with admin credentials and environment variables."
    >
      <VentureCreateForm />
    </Container>
  );
}
