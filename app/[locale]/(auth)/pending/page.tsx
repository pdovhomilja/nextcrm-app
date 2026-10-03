import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import TryAgain from "./components/TryAgain";
import { Users } from "@prisma/client";

const PendingPage = async () => {
  const session = await getSession();
  const bootstrapAdminEmail = (
    process.env.BOOTSTRAP_ADMIN_EMAIL || "jayandraa5@gmail.com"
  ).trim().toLowerCase();

  // Repair the configured bootstrap account if it was created before the
  // bootstrap rule existed or was left in PENDING state.
  if (
    session?.user.email?.trim().toLowerCase() === bootstrapAdminEmail &&
    session.user.userStatus !== "ACTIVE"
  ) {
    await prismadb.users.update({
      where: { id: session.user.id },
      data: { role: "admin", userStatus: "ACTIVE" },
    });
    return redirect("/");
  }

  const adminUsers: Users[] = await prismadb.users.findMany({
    where: {
      role: "admin",
      userStatus: "ACTIVE",
    },
  });

  if (session?.user.userStatus !== "PENDING") {
    return redirect("/");
  }

  return (
    <div className="flex flex-col space-y-5 justify-center items-center max-w-3xl border rounded-md p-10 shadow-md">
      {/*       <pre>
        <code>{JSON.stringify(session, null, 2)}</code>
      </pre> */}
      <div className="flex flex-col">
        <h1 className="text-3xl">
          {process.env.NEXT_PUBLIC_APP_NAME} - your account must be allowed by
          Admin
        </h1>
        <p>
          Hi, welcome to {process.env.NEXT_PUBLIC_APP_NAME}. Ask someone in your
          organization to approve your account. If you are fist user call to
          tech support to enable account.
        </p>
      </div>
      <div className="flex flex-col justify-center ">
        <h2 className="flex justify-center text-xl">Admin List</h2>
        {adminUsers &&
          adminUsers?.map((user: Users) => (
            <div
              key={user.id}
              className="flex flex-col p-5 m-2 gap-3 border rounded-md"
            >
              <div>
                <p className="font-bold">{user.name}</p>
                <p>{user.id}</p>
                <p>
                  <Link href={`mailto:  ${user.email}`}>{user.email}</Link>
                </p>
              </div>
            </div>
          ))}
      </div>
      <div className="flex flex-col md:flex-row space-x-2 justify-center items-center">
        <Button asChild>
          <Link href="/sign-in">Log-in with another account</Link>
        </Button>
        <p>or</p>
        <TryAgain />
      </div>
    </div>
  );
};

export default PendingPage;
