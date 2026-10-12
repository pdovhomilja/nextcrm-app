"use client";

import * as React from "react";

/** True when the primary modifier is ⌘ (Apple platforms). */
export function useIsMac() {
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    const platform =
      typeof navigator !== "undefined"
        ? navigator.platform || navigator.userAgent
        : "";
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(platform));
  }, []);

  return isMac;
}

export function useModKeyLabel() {
  const isMac = useIsMac();
  return isMac ? "Cmd" : "Ctrl";
}
