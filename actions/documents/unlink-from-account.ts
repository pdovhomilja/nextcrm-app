"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function unlinkFromAccount(documentId: string, accountId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await prismadb.documentsToAccounts.delete({
    where: {
      document_id_account_id: { document_id: documentId, account_id: accountId },
    },
  });

  revalidatePath("/[locale]/(routes)/documents");
  revalidatePath(`/[locale]/(routes)/crm/accounts/${accountId}`);
}
