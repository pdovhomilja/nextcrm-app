import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import type { Settings } from "../settings";
import { loadSummary, summaryText } from "./common";

export async function ProtectionPanel({ accountId, ctx }: AccountSlotProps<Settings>) {
  const { summary } = await loadSummary(ctx, accountId);
  return <p className="text-sm font-medium">{summaryText(ctx, summary)}</p>;
}
