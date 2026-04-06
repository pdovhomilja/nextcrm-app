import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import {
  paginationSchema,
  paginationArgs,
  listResponse,
  itemResponse,
  notFound,
  conflict,
} from "../helpers";

export const campaignTools = [
  // ── Campaigns CRUD ────────────────────────────────────
  {
    name: "campaigns_list",
    description: "List campaigns (org-wide)",
    schema: z.object({
      status: z.enum(["draft", "scheduled", "sending", "sent", "paused"]).optional(),
      ...paginationSchema,
    }),
    async handler(args: { status?: string; limit: number; offset: number }, _userId: string) {
      const where: any = args.status
        ? { status: args.status }
        : { status: { not: "deleted" } };
      const [data, total] = await Promise.all([
        prismadb.crm_campaigns.findMany({
          where,
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
          include: { _count: { select: { steps: true, sends: true } } },
        }),
        prismadb.crm_campaigns.count({ where }),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "campaigns_get",
    description: "Get a campaign by ID with steps and stats summary",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id, status: { not: "deleted" } },
        include: {
          steps: { orderBy: { order: "asc" }, include: { template: true } },
          target_lists: { include: { target_list: true } },
          _count: { select: { sends: true } },
        },
      });
      if (!campaign) notFound("Campaign");
      return itemResponse(campaign);
    },
  },
  {
    name: "campaigns_create",
    description: "Create a new campaign",
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      from_name: z.string().optional(),
      reply_to: z.string().email().optional(),
      template_id: z.string().uuid().optional(),
    }),
    async handler(
      args: { name: string; description?: string; from_name?: string; reply_to?: string; template_id?: string },
      userId: string
    ) {
      const campaign = await prismadb.crm_campaigns.create({
        data: {
          v: 0,
          name: args.name,
          description: args.description,
          from_name: args.from_name,
          reply_to: args.reply_to,
          template_id: args.template_id,
          status: "draft",
          created_by: userId,
        },
      });
      return itemResponse(campaign);
    },
  },
  {
    name: "campaigns_update",
    description: "Update a campaign by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      from_name: z.string().optional(),
      reply_to: z.string().email().optional(),
      template_id: z.string().uuid().optional(),
    }),
    async handler(args: Record<string, any>, _userId: string) {
      const existing = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id, status: { not: "deleted" } },
      });
      if (!existing) notFound("Campaign");
      if (existing.status === "sending") conflict("Cannot update a campaign that is currently sending");
      const { id, ...updateData } = args;
      const campaign = await prismadb.crm_campaigns.update({ where: { id }, data: updateData });
      return itemResponse(campaign);
    },
  },
  {
    name: "campaigns_delete",
    description: "Soft-delete a campaign (sets status to deleted)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const existing = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id, status: { not: "deleted" } },
      });
      if (!existing) notFound("Campaign");
      if (existing.status === "sending") conflict("Cannot delete a campaign that is currently sending");
      await prismadb.crm_campaigns.update({ where: { id: args.id }, data: { status: "deleted" } });
      return itemResponse({ id: args.id, status: "deleted" });
    },
  },

  // ── Send / Pause / Resume ─────────────────────────────
  {
    name: "campaigns_send",
    description: "Trigger sending a campaign. Campaign must be in draft or scheduled status.",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id, status: { not: "deleted" } },
      });
      if (!campaign) notFound("Campaign");
      if (!["draft", "scheduled"].includes(campaign.status ?? "")) {
        conflict(`Cannot send campaign in status: ${campaign.status}`);
      }
      const now = new Date();
      await prismadb.crm_campaigns.update({
        where: { id: args.id },
        data: { status: "sending", scheduled_at: now },
      });
      await inngest.send({ name: "campaigns/send-now", data: { campaignId: args.id } });
      return itemResponse({ id: args.id, status: "sending" });
    },
  },
  {
    name: "campaigns_pause",
    description: "Pause an active/sending campaign",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id },
      });
      if (!campaign) notFound("Campaign");
      if (campaign.status !== "sending") conflict(`Cannot pause campaign in status: ${campaign.status}`);
      await prismadb.crm_campaigns.update({ where: { id: args.id }, data: { status: "paused" } });
      return itemResponse({ id: args.id, status: "paused" });
    },
  },
  {
    name: "campaigns_resume",
    description: "Resume a paused campaign",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id },
      });
      if (!campaign) notFound("Campaign");
      if (campaign.status !== "paused") conflict(`Cannot resume campaign in status: ${campaign.status}`);
      await prismadb.crm_campaigns.update({ where: { id: args.id }, data: { status: "sending" } });
      await inngest.send({ name: "campaigns/send-now", data: { campaignId: args.id } });
      return itemResponse({ id: args.id, status: "sending" });
    },
  },

  // ── Templates ─────────────────────────────────────────
  {
    name: "campaigns_list_templates",
    description: "List campaign email templates (org-wide)",
    schema: z.object({ ...paginationSchema }),
    async handler(args: { limit: number; offset: number }, _userId: string) {
      const [data, total] = await Promise.all([
        prismadb.crm_campaign_templates.findMany({
          ...paginationArgs(args),
          orderBy: { created_on: "desc" },
        }),
        prismadb.crm_campaign_templates.count(),
      ]);
      return listResponse(data, total, args.offset);
    },
  },
  {
    name: "campaigns_get_template",
    description: "Get a campaign template by ID",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const template = await prismadb.crm_campaign_templates.findUnique({ where: { id: args.id } });
      if (!template) notFound("Template");
      return itemResponse(template);
    },
  },
  {
    name: "campaigns_create_template",
    description: "Create a campaign email template",
    schema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      subject_default: z.string().optional(),
      content_html: z.string().min(1),
      content_json: z.any(),
    }),
    async handler(
      args: { name: string; description?: string; subject_default?: string; content_html: string; content_json: any },
      userId: string
    ) {
      const template = await prismadb.crm_campaign_templates.create({
        data: {
          name: args.name,
          description: args.description,
          subject_default: args.subject_default,
          content_html: args.content_html,
          content_json: args.content_json,
          created_by: userId,
        },
      });
      return itemResponse(template);
    },
  },
  {
    name: "campaigns_update_template",
    description: "Update a campaign template by ID",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      subject_default: z.string().optional(),
      content_html: z.string().optional(),
      content_json: z.any().optional(),
    }),
    async handler(args: Record<string, any>, _userId: string) {
      const existing = await prismadb.crm_campaign_templates.findUnique({ where: { id: args.id } });
      if (!existing) notFound("Template");
      const { id, ...updateData } = args;
      const template = await prismadb.crm_campaign_templates.update({ where: { id }, data: updateData });
      return itemResponse(template);
    },
  },
  {
    name: "campaigns_delete_template",
    description: "Soft-delete a campaign template (not yet supported — pending schema migration)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(_args: { id: string }, _userId: string) {
      conflict("Soft delete not yet supported for campaign templates. See docs/soft-delete-gaps.md");
    },
  },

  // ── Steps ─────────────────────────────────────────────
  {
    name: "campaigns_create_step",
    description: "Add a step to a campaign sequence",
    schema: z.object({
      campaign_id: z.string().uuid(),
      order: z.number().int().min(1),
      template_id: z.string().uuid(),
      subject: z.string().min(1),
      delay_days: z.number().int().min(0).default(0),
      send_to: z.enum(["all", "non_openers"]).default("all"),
    }),
    async handler(
      args: { campaign_id: string; order: number; template_id: string; subject: string; delay_days: number; send_to: string },
      _userId: string
    ) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.campaign_id, status: { not: "deleted" } },
      });
      if (!campaign) notFound("Campaign");
      const step = await prismadb.crm_campaign_steps.create({ data: args });
      return itemResponse(step);
    },
  },
  {
    name: "campaigns_update_step",
    description: "Update a campaign step by ID",
    schema: z.object({
      id: z.string().uuid(),
      order: z.number().int().min(1).optional(),
      template_id: z.string().uuid().optional(),
      subject: z.string().min(1).optional(),
      delay_days: z.number().int().min(0).optional(),
      send_to: z.enum(["all", "non_openers"]).optional(),
    }),
    async handler(args: Record<string, any>, _userId: string) {
      const existing = await prismadb.crm_campaign_steps.findUnique({ where: { id: args.id } });
      if (!existing) notFound("CampaignStep");
      const { id, ...updateData } = args;
      const step = await prismadb.crm_campaign_steps.update({ where: { id }, data: updateData });
      return itemResponse(step);
    },
  },
  {
    name: "campaigns_delete_step",
    description: "Delete a campaign step by ID (hard delete — step has no status field)",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const existing = await prismadb.crm_campaign_steps.findUnique({ where: { id: args.id } });
      if (!existing) notFound("CampaignStep");
      await prismadb.crm_campaign_steps.delete({ where: { id: args.id } });
      return itemResponse({ id: args.id, deleted: true });
    },
  },

  // ── Target List Assignment ────────────────────────────
  {
    name: "campaigns_assign_target_list",
    description: "Assign a target list to a campaign",
    schema: z.object({
      campaign_id: z.string().uuid(),
      target_list_id: z.string().uuid(),
    }),
    async handler(args: { campaign_id: string; target_list_id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.campaign_id, status: { not: "deleted" } },
      });
      if (!campaign) notFound("Campaign");
      await prismadb.campaignToTargetLists.create({
        data: { campaign_id: args.campaign_id, target_list_id: args.target_list_id },
      });
      return itemResponse({ campaign_id: args.campaign_id, target_list_id: args.target_list_id });
    },
  },
  {
    name: "campaigns_remove_target_list",
    description: "Remove a target list from a campaign",
    schema: z.object({
      campaign_id: z.string().uuid(),
      target_list_id: z.string().uuid(),
    }),
    async handler(args: { campaign_id: string; target_list_id: string }, _userId: string) {
      await prismadb.campaignToTargetLists.delete({
        where: {
          campaign_id_target_list_id: {
            campaign_id: args.campaign_id,
            target_list_id: args.target_list_id,
          },
        },
      });
      return itemResponse({ campaign_id: args.campaign_id, target_list_id: args.target_list_id, removed: true });
    },
  },

  // ── Stats ─────────────────────────────────────────────
  {
    name: "campaigns_get_stats",
    description: "Get send/open/click/unsubscribe stats for a campaign",
    schema: z.object({ id: z.string().uuid() }),
    async handler(args: { id: string }, _userId: string) {
      const campaign = await prismadb.crm_campaigns.findFirst({
        where: { id: args.id, status: { not: "deleted" } },
      });
      if (!campaign) notFound("Campaign");
      const sends = await prismadb.crm_campaign_sends.findMany({
        where: { campaign_id: args.id },
        select: { status: true, opened_at: true, clicked_at: true, unsubscribed_at: true },
      });
      const stats = {
        total: sends.length,
        sent: sends.filter((s) => s.status === "sent" || s.status === "delivered").length,
        delivered: sends.filter((s) => s.status === "delivered").length,
        bounced: sends.filter((s) => s.status === "bounced").length,
        failed: sends.filter((s) => s.status === "failed").length,
        opened: sends.filter((s) => s.opened_at).length,
        clicked: sends.filter((s) => s.clicked_at).length,
        unsubscribed: sends.filter((s) => s.unsubscribed_at).length,
      };
      return itemResponse(stats);
    },
  },
];
