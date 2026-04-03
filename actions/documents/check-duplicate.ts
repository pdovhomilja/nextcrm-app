"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

interface DuplicateResult {
  isDuplicate: boolean;
  existingDocument?: {
    id: string;
    name: string;
    createdAt: Date | null;
    accountName?: string;
  };
}

export async function checkDuplicate(contentHash: string): Promise<DuplicateResult> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const existing = await prismadb.documents.findFirst({
    where: { content_hash: contentHash },
    select: {
      id: true,
      document_name: true,
      createdAt: true,
      accounts: {
        select: { account: { select: { name: true } } },
        take: 1,
      },
    },
  });

  if (!existing) return { isDuplicate: false };

  return {
    isDuplicate: true,
    existingDocument: {
      id: existing.id,
      name: existing.document_name,
      createdAt: existing.createdAt,
      accountName: existing.accounts[0]?.account.name,
    },
  };
}
