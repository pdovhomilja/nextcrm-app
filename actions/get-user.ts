import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";

export const getUser = async () => {
  const session = await getSession();
  const data = await prismadb.users.findUnique({
    where: {
      id: session?.user?.id,
    },
  });
  if (!data) throw new Error("User not found");
  return data;
};
