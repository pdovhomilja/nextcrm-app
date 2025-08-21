import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  } else {
    const activeCompanyId = session?.user?.activeCompanyId;
    if (!activeCompanyId) {
      // If user has no active company, something went wrong
      // Let them sign in again to trigger company creation
      redirect("/auth/signin?error=no_company");
    } else {
      redirect(`/${activeCompanyId}/dashboard`);
    }
  }

  return null;
}
