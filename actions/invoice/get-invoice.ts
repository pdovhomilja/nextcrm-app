import { prismadb } from "@/lib/prisma";
import { junctionTableHelpers } from "@/lib/junction-helpers";

export const getInvoice = async (invoiceId: string) => {
  const data = await prismadb.invoices.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
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
              document_file_mimeType: true,
              createdAt: true,
              created_by: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return data;
};
