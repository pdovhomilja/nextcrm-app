import { pauseCampaign } from "@/actions/campaigns/pause-campaign";
import StepsTimeline from "./StepsTimeline";
import RecipientsTable from "./RecipientsTable";
import type { getCampaign } from "@/actions/campaigns/get-campaign";

type CampaignWithData = NonNullable<Awaited<ReturnType<typeof getCampaign>>>;

export default function CampaignDetail({ campaign }: { campaign: CampaignWithData }) {
  const sends = campaign.sends;
  const totalSent = sends.filter((s) => ["sent", "delivered", "bounced"].includes(s.status)).length;
  const delivered = sends.filter((s) => s.status === "delivered").length;
  const opened = sends.filter((s) => s.opened_at != null).length;
  const clicked = sends.filter((s) => s.clicked_at != null).length;
  const bounced = sends.filter((s) => s.status === "bounced").length;
  const openRate = totalSent > 0 ? Math.round((opened / totalSent) * 100) : 0;
  const clickRate = totalSent > 0 ? Math.round((clicked / totalSent) * 100) : 0;

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    scheduled: "bg-blue-100 text-blue-700",
    sending: "bg-amber-100 text-amber-700",
    sent: "bg-green-100 text-green-700",
    paused: "bg-orange-100 text-orange-700",
  };
  const statusColor = statusColors[campaign.status ?? "draft"] ?? "bg-gray-100 text-gray-700";

  const canPause = campaign.status === "scheduled" || campaign.status === "sending";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
              {campaign.status?.toUpperCase()}
            </span>
          </div>
          {campaign.description && (
            <p className="text-muted-foreground">{campaign.description}</p>
          )}
        </div>
        {canPause && (
          <form
            action={async () => {
              "use server";
              await pauseCampaign(campaign.id);
            }}
          >
            <button
              type="submit"
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted"
            >
              Pause
            </button>
          </form>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Sent", value: totalSent },
          { label: "Delivered", value: delivered },
          { label: "Open Rate", value: `${openRate}%` },
          { label: "Click Rate", value: `${clickRate}%` },
          { label: "Bounced", value: bounced },
        ].map(({ label, value }) => (
          <div key={label} className="bg-muted/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Steps Timeline */}
      <StepsTimeline steps={campaign.steps} />

      {/* Recipients Table */}
      <RecipientsTable sends={campaign.sends} />
    </div>
  );
}
