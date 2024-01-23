import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import TryAgain from "./components/TryAgain";
import { Users } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

const PendingPage = async () => {
  const adminUsers: Users[] = await prismadb.users.findMany({
    where: {
      is_admin: true,
      userStatus: "ACTIVE",
    },
  });

  const session = await getServerSession(authOptions);

  if (session?.user.userStatus !== "INACTIVE") {
    return redirect("/");
  }

  return (
    <Card className="p-10 space-y- m-10">
      <CardTitle className="flex justify-center py-10">
        Your account has been deactivated by Admin
      </CardTitle>
      <CardDescription className="py-3">
        Hi, your {process.env.NEXT_PUBLIC_APP_NAME} account has been disabled.
        Ask someone in your organization to activate your account again.
      </CardDescription>
      <CardContent>
        <h2 className="flex justify-center text-xl">Admin List</h2>
        <div className="flex flex-wrap justify-center">
          {adminUsers &&
            adminUsers?.map((user: Users) => (
              <div
                key={user.id}
                className="flex flex-col p-5 m-2 gap-3 border rounded-md"
              >
                <div>
                  <p className="font-bold">{user.name}</p>
                  <p>
                    <Link href={`mailto:  ${user.email}`}>{user.email}</Link>
                  </p>
                </div>
              </div>
            ))}
        </div>

        <div className="flex flex-col md:flex-row space-x-2 justify-center items-center pt-5">
          <Button asChild>
            <Link href="/sign-in">Log-in with another account</Link>
          </Button>
          <p>or</p>
          <TryAgain />
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingPage;
