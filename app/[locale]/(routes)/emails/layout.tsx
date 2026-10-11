import React from "react";

export default function EmailsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col">{children}</div>
  );
}
