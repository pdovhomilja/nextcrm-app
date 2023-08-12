import { prismadb } from "@/lib/prisma";
import { MyAccount } from "@prisma/client";

export async function getAccountSettings() {
  const myAccount = await prismadb.myAccount.findFirst({});

  return myAccount;
}
