import { getSessionAnyStatus } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

// Partners sign in but get no app yet (partner-role spec, ticket 4 opens it).
const PartnerPendingPage = async () => {
  const session = await getSessionAnyStatus();

  if (session?.user.role !== "partner") {
    return redirect("/");
  }

  return (
    <Card className="p-10 m-10">
      <CardTitle className="flex justify-center py-10">
        Your partner access is not ready yet
      </CardTitle>
      <CardDescription className="py-3">
        Hi, your {process.env.NEXT_PUBLIC_APP_NAME} partner account exists, but
        the partner area is not open yet. Your contact will let you know when it is.
      </CardDescription>
    </Card>
  );
};

export default PartnerPendingPage;
