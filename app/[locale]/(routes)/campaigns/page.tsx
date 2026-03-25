import { getCampaigns } from "@/actions/campaigns/get-campaigns";
import CampaignsView from "./components/CampaignsView";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Manage your email campaigns</p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">+ New Campaign</Link>
        </Button>
      </div>
      <CampaignsView data={campaigns} />
    </div>
  );
}
