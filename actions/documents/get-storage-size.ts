import { prismadb } from "@/lib/prisma";

export const getStorageSize = async () => {
  const data = await prismadb.documents.aggregate({
    _sum: { size: true },
  });

  const bytes = data._sum.size ?? 0;
  const storageSizeMB = bytes / 1_000_000;

  return Math.round(storageSizeMB * 100) / 100;
};
