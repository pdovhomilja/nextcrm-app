import { WizardShell } from "./components/WizardShell";
import { getTemplates } from "@/actions/campaigns/templates/get-templates";
import { prismadb } from "@/lib/prisma";

export default async function NewCampaignPage() {
  const [templates, targetLists] = await Promise.all([
    getTemplates(),
    prismadb.crm_TargetLists.findMany({
      where: { status: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { targets: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">New Campaign</h1>
        <p className="text-muted-foreground">Create an email campaign</p>
      </div>
      <WizardShell templates={templates} targetLists={targetLists} />
    </div>
  );
}
