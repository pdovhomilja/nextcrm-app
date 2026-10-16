"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { logoutRofytAdmin } from "@/actions/ventures/rofyt-login";
import { Button } from "@/components/ui/button";

export function RofytLockButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await logoutRofytAdmin();
          router.refresh();
        });
      }}
    >
      {pending ? "Locking…" : "Lock Rofyt"}
    </Button>
  );
}
