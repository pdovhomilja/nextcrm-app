import React from "react";
import { requireFeaturePage } from "@/lib/authz";

export default async function EmailsLayout({ children }: { children: React.ReactNode }) {
  await requireFeaturePage("emails");
  return (
    <div data-emails-shell className="emails-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
