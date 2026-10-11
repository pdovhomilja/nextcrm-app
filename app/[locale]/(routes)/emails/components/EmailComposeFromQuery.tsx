"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ComposeModal } from "./ComposeModal";

type Props = {
  accountId: string;
  mailboxAddress: string;
};

/** Opens compose once when `?composeTo=` is present (team chat / deep links). */
export function EmailComposeFromQuery({ accountId, mailboxAddress }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const composeTo = searchParams.get("composeTo")?.trim();
  const [seed, setSeed] = React.useState(0);

  React.useEffect(() => {
    if (composeTo) setSeed((n) => n + 1);
  }, [composeTo]);

  function clearComposeParam() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("composeTo");
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  if (!composeTo || !accountId) return null;

  return (
    <ComposeModal
      key={`${composeTo}-${seed}`}
      accountId={accountId}
      mailboxAddress={mailboxAddress}
      mode="new"
      defaultOpen
      headless
      initialTo={decodeURIComponent(composeTo)}
      onSent={clearComposeParam}
      onClose={clearComposeParam}
    />
  );
}
