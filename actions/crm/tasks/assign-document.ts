"use server";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const assignDocumentToCrmTask = async (data: {
  documentId: string;
  taskId: string;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { documentId, taskId } = data;
  if (!documentId) return { error: "Missing document ID" };
  if (!taskId) return { error: "Missing task ID" };

  try {
    const task = await prismadb.crm_Accounts_Tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) return { error: "CRM task not found" };

    await prismadb.documentsToCrmAccountsTasks.create({
      data: {
        document_id: documentId,
        crm_accounts_task_id: taskId,
      },
    });

    revalidatePath("/[locale]/(routes)/crm", "page");
    return { success: true };
  } catch (error) {
    console.log("[ASSIGN_DOCUMENT_TO_CRM_TASK]", error);
    return { error: "Failed to assign document to CRM task" };
  }
};

export const disconnectDocumentFromCrmTask = async (data: {
  documentId: string;
  taskId: string;
}) => {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const { documentId, taskId } = data;
  if (!documentId) return { error: "Missing document ID" };
  if (!taskId) return { error: "Missing task ID" };

  try {
    const task = await prismadb.crm_Accounts_Tasks.findUnique({
      where: { id: taskId },
    });

    if (!task) return { error: "CRM task not found" };

    await prismadb.documentsToCrmAccountsTasks.delete({
      where: {
        document_id_crm_accounts_task_id: {
          document_id: documentId,
          crm_accounts_task_id: taskId,
        },
      },
    });

    revalidatePath("/[locale]/(routes)/crm", "page");
    return { success: true };
  } catch (error) {
    console.log("[DISCONNECT_DOCUMENT_FROM_CRM_TASK]", error);
    return { error: "Failed to disconnect document from CRM task" };
  }
};
