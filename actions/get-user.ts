import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export const getUser = async () => {
  const session = await getServerSession(authOptions);
  const data = await prismadb.users.findUnique({
    where: {
      id: session?.user?.id,
    },
  });
  if (!data) throw new Error("User not found");
  return data;
};
