import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers } from "@/lib/junction-helpers";

export const getInvoices = async () => {
  const data = await prismadb.invoices.findMany({
    include: {
      users: {
        select: {
          name: true,
        },
      },
      // Include documents through DocumentsToInvoices junction table
      documents: {
        include: {
          document: {
            select: {
              id: true,
              document_name: true,
              document_type: true,
              document_file_url: true,
            },
          },
        },
      },
    },
    orderBy: {
      date_created: "desc",
    },
  });

  return data;
};
