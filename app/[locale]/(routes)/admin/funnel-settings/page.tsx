import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import FunnelSettingsForm from "./_components/FunnelSettingsForm";
import { requireRole } from "@/lib/authz";

const FunnelSettingsPage = async () => {
  await requireRole(["admin"]);
  const settings = await getFunnelSettings();
  return <FunnelSettingsForm initial={settings} />;
};

export default FunnelSettingsPage;
