import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { randomUUID } from "crypto";
import {
  getObjectUploadUrl,
  getObjectDownloadUrl,
  getObjectPublicUrl,
} from "@/lib/storage";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  validationError,
  softDeleteData,
} from "../helpers";

// Map entity types to their Prisma junction table accessor names (camelCase, lowercase first)
const ENTITY_LINK_MAP: Record<string, string> = {
  account: "documentsToAccounts",
  contact: "documentsToContacts",
  lead: "documentsToLeads",
  opportunity: "documentsToOpportunities",
  task: "documentsToTasks",
};

const ENTITY_FK_MAP: Record<string, string> = {
  account: "account_id",
  contact: "contact_id",
  lead: "lead_id",
  opportunity: "opportunity_id",
  task: "task_id",
};

export const crmDocumentTools = [
  {
    name: "crm_list_documents",
    description: "List documents, optionally filtered by linked entity type and ID",
    schema: z.object({
      entityType: z
        .enum(["account", "contact", "lead", "opportunity", "task"])
        .optional(),
      entityId: z.string().uuid().optional(),
      ...paginationSchema,
    }),
    async handler(
      args: {
        entityType?: string;
        entityId?: string;
        limit: number;
        offset: number;
      },
      userId: string
    ) {
      const where: any = {
        created_by_user: userId,
        deletedAt: null,
      };
      if (args.entityType && args.entityId) {
        const relation =
          args.entityType === "account"
            ? "accounts"
            : args.entityType === "contact"
            ? "contacts"
            : args.entityType === "lead"
            ? "leads"
            : args.entityType === "opportunity"
            ? "opportunities"
            : "tasks";
        where[relation] = {
          some: { [ENTITY_FK_MAP[args.entityType]]: args.entityId },
        };
      }
      const [data, total] = await Promise.all([
        prismadb.documents.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { createdAt: "desc" },
        }),
        prismadb.documents.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "crm_get_document",
    description: "Get a single document by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const doc = await prismadb.documents.findFirst({
        where: { id: args.id, created_by_user: userId, deletedAt: null },
        include: {
          accounts: true,
          contacts: true,
          leads: true,
          opportunities: true,
          tasks: true,
        },
      });
      if (!doc) notFound("Document");
      return itemResponse(doc);
    },
  },
  {
    name: "crm_create_document",
    description: "Create a document record and get a presigned upload URL",
    schema: z.object({
      document_name: z.string().min(1),
      contentType: z.string().min(1),
      description: z.string().optional(),
      visibility: z.string().optional(),
    }),
    async handler(
      args: {
        document_name: string;
        contentType: string;
        description?: string;
        visibility?: string;
      },
      userId: string
    ) {
      const ext = args.document_name.includes(".")
        ? args.document_name.split(".").pop()?.trim() || "bin"
        : "bin";
      const key = `documents/${randomUUID()}.${ext}`;
      const fileUrl = getObjectPublicUrl(key);

      const doc = await prismadb.documents.create({
        data: {
          document_name: args.document_name,
          document_file_mimeType: args.contentType,
          document_file_url: fileUrl,
          key,
          description: args.description,
          visibility: args.visibility,
          created_by_user: userId,
          createdBy: userId,
          processing_status: "PENDING",
        },
      });

      const uploadUrl = await getObjectUploadUrl(key, args.contentType, 600);

      return itemResponse({ ...doc, presignedUrl: uploadUrl, expiresIn: 600 });
    },
  },
  {
    name: "crm_get_upload_url",
    description: "Get a presigned upload URL for an existing document",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const doc = await prismadb.documents.findFirst({
        where: { id: args.id, created_by_user: userId },
      });
      if (!doc) notFound("Document");
      if (!doc.key) validationError("Document has no storage key");
      const uploadUrl = await getObjectUploadUrl(doc.key!, doc.document_file_mimeType, 600);
      return itemResponse({ id: doc.id, url: uploadUrl, expiresIn: 600 });
    },
  },
  {
    name: "crm_get_download_url",
    description: "Get a presigned download URL for a document",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const doc = await prismadb.documents.findFirst({
        where: { id: args.id, created_by_user: userId },
      });
      if (!doc) notFound("Document");
      if (!doc.key) validationError("Document has no storage key");
      const downloadUrl = await getObjectDownloadUrl(doc.key!, 3600);
      return itemResponse({ id: doc.id, url: downloadUrl, expiresIn: 3600 });
    },
  },
  {
    name: "crm_link_document",
    description:
      "Link a document to an entity (account, contact, lead, opportunity, or task)",
    schema: z.object({
      document_id: z.string().uuid(),
      entityType: z.enum(["account", "contact", "lead", "opportunity", "task"]),
      entityId: z.string().uuid(),
    }),
    async handler(
      args: { document_id: string; entityType: string; entityId: string },
      userId: string
    ) {
      const doc = await prismadb.documents.findFirst({
        where: { id: args.document_id, created_by_user: userId },
      });
      if (!doc) notFound("Document");

      const table = ENTITY_LINK_MAP[args.entityType];
      const fk = ENTITY_FK_MAP[args.entityType];
      if (!table || !fk) validationError(`Invalid entity type: ${args.entityType}`);

      await (prismadb as any)[table].create({
        data: { document_id: args.document_id, [fk]: args.entityId },
      });

      return itemResponse({
        document_id: args.document_id,
        entityType: args.entityType,
        entityId: args.entityId,
      });
    },
  },
  {
    name: "crm_unlink_document",
    description: "Remove a document link from an entity",
    schema: z.object({
      document_id: z.string().uuid(),
      entityType: z.enum(["account", "contact", "lead", "opportunity", "task"]),
      entityId: z.string().uuid(),
    }),
    async handler(
      args: { document_id: string; entityType: string; entityId: string },
      userId: string
    ) {
      const doc = await prismadb.documents.findFirst({
        where: { id: args.document_id, created_by_user: userId },
      });
      if (!doc) notFound("Document");

      const table = ENTITY_LINK_MAP[args.entityType];
      const fk = ENTITY_FK_MAP[args.entityType];
      if (!table || !fk) validationError(`Invalid entity type: ${args.entityType}`);

      await (prismadb as any)[table].delete({
        where: {
          [`document_id_${fk}`]: {
            document_id: args.document_id,
            [fk]: args.entityId,
          },
        },
      });

      return itemResponse({
        document_id: args.document_id,
        entityType: args.entityType,
        entityId: args.entityId,
        unlinked: true,
      });
    },
  },
  {
    name: "crm_delete_document",
    description: "Soft-delete a document (sets status to DELETED)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, userId: string) {
      const existing = await prismadb.documents.findFirst({
        where: { id: args.id, created_by_user: userId, deletedAt: null },
      });
      if (!existing) notFound("Document");
      const doc = await prismadb.documents.update({
        where: { id: args.id },
        data: softDeleteData(userId),
      });
      return itemResponse({ id: doc.id, deletedAt: doc.deletedAt });
    },
  },
];
