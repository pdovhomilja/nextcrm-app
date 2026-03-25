import { notFound } from "next/navigation";
import { getCampaign } from "@/actions/campaigns/get-campaign";
import CampaignDetail from "./components/CampaignDetail";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const campaign = await getCampaign(campaignId);
  if (!campaign || campaign.status === "deleted") notFound();

  return (
    <div className="flex flex-col gap-6 p-6">
      <CampaignDetail campaign={campaign} />
    </div>
  );
}
