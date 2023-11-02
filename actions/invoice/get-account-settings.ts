import { prismadb } from "@/lib/prisma";

export async function getAccountSettings() {
  const myAccount = await prismadb.myAccount.findFirst({});

  return myAccount;
}
