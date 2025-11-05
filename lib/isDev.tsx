import React from "react";

export const IsDev = ({ children }: { children: React.ReactNode }) => {
  if (process.env.NODE_ENV === "development") {
    return <>{children}</>;
  }
  return null;
};
