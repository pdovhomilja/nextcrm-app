import { MailSettings } from "@/components/settings/mail-settings";
import React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";

const SettingPage = () => {
  return (
    <SidebarInset>
      <SiteHeader title="Settings">
        <div className="flex items-center gap-2">{/* Nav buttons */}</div>
      </SiteHeader>
      <div className="p-4 md:p-6">
        <MailSettings />
      </div>
    </SidebarInset>
  );
};

export default SettingPage;
