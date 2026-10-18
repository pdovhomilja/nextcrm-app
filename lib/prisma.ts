import { Prisma } from "@prisma/client";
import { prismaBase } from "@/lib/prisma-base";
import { withPluginRules } from "@/lib/plugins/prisma-extension";
import { withDocumentFileRoutes } from "@/lib/documents/file-key";

// Document files are private: every prismadb result (lists, nested includes,
// MCP) gets /api/documents/<id>/file instead of the stored MinIO URL. A query
// extension, not a result extension: result extensions add a symbol to every
// row, which React refuses to pass to client components. Code that needs the
// stored URL reads via prismaBase.
const privateDocumentFiles = Prisma.defineExtension({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        return withDocumentFileRoutes(await query(args));
      },
    },
  },
});

export const prismadb = withPluginRules(prismaBase).$extends(privateDocumentFiles);
export type DbClient = typeof prismadb;
