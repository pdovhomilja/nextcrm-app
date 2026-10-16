"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ComposeModal } from "./ComposeModal";

type Props = {
  accountId: string;
  mailboxAddress: string;
};

/** Opens compose when `?composeTo=` is present (assistant, team chat, deep links). */
export function EmailComposeFromQuery({ accountId, mailboxAddress }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const composeTo = searchParams.get("composeTo")?.trim();
  const composePrompt = searchParams.get("composePrompt")?.trim() ?? "";
  const composeAuto = searchParams.get("composeAuto") === "1";
  const [seed, setSeed] = React.useState(0);

  React.useEffect(() => {
    if (composeTo) setSeed((n) => n + 1);
  }, [composeTo, composePrompt, composeAuto]);

  function clearComposeParam() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("composeTo");
    p.delete("composePrompt");
    p.delete("composeAuto");
    const qs = p.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  if (!composeTo || !accountId) return null;

  return (
    <ComposeModal
      key={`${composeTo}-${composePrompt}-${seed}`}
      accountId={accountId}
      mailboxAddress={mailboxAddress}
      mode="new"
      defaultOpen
      headless
      initialTo={decodeURIComponent(composeTo)}
      initialAiPrompt={composePrompt ? decodeURIComponent(composePrompt) : undefined}
      autoGenerateAi={composeAuto && Boolean(composePrompt)}
      onSent={clearComposeParam}
      onClose={clearComposeParam}
    />
  );
}
