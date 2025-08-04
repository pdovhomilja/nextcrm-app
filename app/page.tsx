import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  } else {
    redirect(`/${session?.user?.cid}/dashboard`);
  }

  return null;
}
