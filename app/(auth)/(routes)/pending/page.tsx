import { Button } from "@/components/ui/button";
import { prismadb } from "@/lib/prisma";
import Link from "next/link";

const PendingPage = async () => {
  const adminUsers = await prismadb.users.findMany({
    where: {
      is_admin: true,
    },
  });

  return (
    <div className="flex flex-col space-y-5 justify-center items-center max-w-3xl border rounded-md p-10 shadow-md">
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
          adminUsers?.map((user) => (
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
        <Button asChild>
          <Link href="/">Try again</Link>
        </Button>
      </div>
    </div>
  );
};

export default PendingPage;
