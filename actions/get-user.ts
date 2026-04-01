import { prismadb } from "@/lib/prisma";

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
