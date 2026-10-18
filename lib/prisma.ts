import { Prisma } from "@prisma/client";
import { prismaBase } from "@/lib/prisma-base";
import { withPluginRules } from "@/lib/plugins/prisma-extension";
import { documentFileRoute } from "@/lib/documents/file-key";

// Document files are private: every read of document_file_url through
// prismadb (lists, includes, MCP) returns the route that checks access, never
// the stored MinIO URL. Code that needs the stored URL reads via prismaBase.
const privateDocumentFiles = Prisma.defineExtension({
  result: {
    documents: {
      document_file_url: {
        needs: { id: true },
        compute: (doc) => documentFileRoute(doc.id),
      },
    },
  },
});

export const prismadb = withPluginRules(prismaBase).$extends(privateDocumentFiles);
export type DbClient = typeof prismadb;
