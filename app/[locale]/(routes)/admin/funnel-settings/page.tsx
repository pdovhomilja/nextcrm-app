import { getFunnelSettings } from "@/lib/crm/funnel-settings";
import FunnelSettingsForm from "./_components/FunnelSettingsForm";

const FunnelSettingsPage = async () => {
  const settings = await getFunnelSettings();
  return <FunnelSettingsForm initial={settings} />;
};

export default FunnelSettingsPage;
