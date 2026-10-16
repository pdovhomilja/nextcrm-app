import React from "react";
import { requireFeaturePage } from "@/lib/authz";
import { EmailsLiveRefresh } from "@/app/[locale]/(routes)/components/EmailsLiveRefresh";

export default async function EmailsLayout({ children }: { children: React.ReactNode }) {
  await requireFeaturePage("emails");
  return (
    <div
      data-emails-shell
      className="emails-shell flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <EmailsLiveRefresh />
      {children}
    </div>
  );
}
