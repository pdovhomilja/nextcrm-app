import { prismadb } from "@/lib/prisma";
import {
  requireAuthenticated,
  documentReadScopeWhere,
  AuthenticationError,
} from "@/lib/authz";

// Size of the documents the caller can read (no org-wide total for user/partner).
export const getStorageSize = async () => {
  let user;
  try {
    user = await requireAuthenticated({ partner: true });
  } catch (e) {
    if (e instanceof AuthenticationError) return 0;
    throw e;
  }
  const data = await prismadb.documents.findMany({
    where: documentReadScopeWhere(user),
  });

  //TODO: fix this any
  const storageSize = data.reduce((acc: number, doc: any) => {
    return acc + doc?.size;
  }, 0);

  const storageSizeMB = storageSize / 1000000;

  return Math.round(storageSizeMB * 100) / 100;
};
