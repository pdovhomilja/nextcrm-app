import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { Resend } from "resend";
import { findRecycleCandidates, RECYCLED_LIST_NAME } from "@/lib/crm/recycle";
import { getFunnelSettings } from "@/lib/crm/funnel-settings";

// Documented deviation from spec §3.3 ("automatically re-tried with a
// sequence"): campaign sends are unique per (step, target), so re-running
// the same campaign is a no-op by design. Instead, recycled targets land
// in the "Recycled" list and admins get a digest — a human assigns the
// recycle batch to a fresh campaign.
export const recycleTargets = inngest.createFunction(
  {
    id: "crm-recycle-targets",
    name: "CRM: Recycle exhausted targets",
    triggers: [{ cron: "30 6 * * *" }],
  },
  async ({ step }) => {
    const candidateIds = await step.run("find-candidates", async () => {
      return findRecycleCandidates(new Date(), await getFunnelSettings());
    });
    if (candidateIds.length === 0) return { recycled: 0 };

    const listId = await step.run("ensure-recycled-list", async () => {
      const existing = await prismadb.crm_TargetLists.findFirst({
        where: { name: RECYCLED_LIST_NAME, deletedAt: null },
      });
      if (existing) return existing.id;
      const created = await prismadb.crm_TargetLists.create({
        data: {
          name: RECYCLED_LIST_NAME,
          description: "Auto-managed: targets whose sequence finished with no response after the recycle window.",
        },
      });
      return created.id;
    });

    await step.run("add-to-list", async () => {
      await prismadb.targetsToTargetLists.createMany({
        data: candidateIds.map((target_id) => ({ target_id, target_list_id: listId })),
        skipDuplicates: true,
      });
    });

    await step.run("notify-admins", async () => {
      const admins = await prismadb.users.findMany({
        where: { role: "admin", userStatus: "ACTIVE" },
        select: { email: true },
      });
      const to = admins.map((a) => a.email).filter(Boolean) as string[];
      if (to.length === 0) return;
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to,
          subject: `${candidateIds.length} targets recycled — assign a new sequence`,
          text: `${candidateIds.length} targets finished their sequence with no response and were added to the "${RECYCLED_LIST_NAME}" target list.\nAssign the list to a fresh campaign: ${process.env.NEXT_PUBLIC_APP_URL}/campaigns/target-lists`,
        });
      } catch (error) {
        console.error("[recycleTargets] digest failed:", error);
      }
    });

    return { recycled: candidateIds.length };
  }
);
