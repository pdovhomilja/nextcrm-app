"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { disconnectCanva } from "@/actions/canva/designs";

export function DisconnectCanvaButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await disconnectCanva();
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Disconnecting…" : "Disconnect"}
    </Button>
  );
}
