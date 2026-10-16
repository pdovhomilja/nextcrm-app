"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { logoutVenturesMaster } from "@/actions/ventures/ventures-master-auth";
import { Button } from "@/components/ui/button";

export function VenturesLockButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await logoutVenturesMaster();
          router.refresh();
        });
      }}
    >
      {pending ? "Locking…" : "Lock Ventures"}
    </Button>
  );
}
