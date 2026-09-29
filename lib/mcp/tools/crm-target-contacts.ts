// Fork-owned MCP tool for creating a target-level contact (crm_Target_Contact),
// mirroring POST /api/crm/targets/[id]/contacts (the "Add Contact" button). Kept in
// its own file and registered in index.ts so upstream crm-targets.ts is untouched.
// See CLAUDE.md "Additive-first change standard".
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { itemResponse, notFound } from "../helpers";

export const crmTargetContactTools = [
  {
    name: "crm_create_target_contact",
    description:
      "Add a person (contact) to a CRM target — the target's own Contacts list (crm_Target_Contact), same as the target detail 'Add Contact' button. Requires target_id and at least a name or email.",
    schema: z.object({
      target_id: z.string().uuid(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      title: z.string().optional(),
      phone: z.string().optional(),
      linkedin_url: z.string().optional(),
    }),
    async handler(
      args: {
        target_id: string;
        name?: string;
        email?: string;
        title?: string;
        phone?: string;
        linkedin_url?: string;
      },
      userId: string
    ) {
      const existing = await prismadb.crm_Targets.findFirst({
        where: { id: args.target_id, created_by: userId, deletedAt: null },
      });
      if (!existing) notFound("Target");
      if (!args.name && !args.email) {
        throw new Error("name or email is required to add a target contact");
      }
      const contact = await prismadb.crm_Target_Contact.create({
        data: {
          targetId: args.target_id,
          name: args.name ?? null,
          email: args.email ?? null,
          title: args.title ?? null,
          phone: args.phone ?? null,
          linkedinUrl: args.linkedin_url ?? null,
          source: "manual",
          enrichStatus: "PENDING",
        },
      });
      return itemResponse(contact);
    },
  },
];
