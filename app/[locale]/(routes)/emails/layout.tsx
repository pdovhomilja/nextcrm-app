import React from "react";
import { requireFeaturePage } from "@/lib/authz";

export default async function EmailsLayout({ children }: { children: React.ReactNode }) {
  await requireFeaturePage("emails");
  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col">{children}</div>
  );
}
