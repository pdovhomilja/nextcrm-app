"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { canValidateVat, validateVatNumber, type VatCheckResult } from "@/actions/crm/accounts/lookup-company";

const MESSAGE: Record<VatCheckResult, string> = {
  valid: "vatValid",
  invalid: "vatInvalid",
  unavailable: "vatUnavailable",
  noPrefix: "vatNoPrefix",
  noProvider: "vatNoProvider",
};

// Informs only; never blocks saving the form.
export function VatCheckButton({ vat }: { vat?: string | null }) {
  const p = useTranslations("Plugins");
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    canValidateVat().then(setAvailable).catch(() => {});
  }, []);
  if (!available) return null;

  const check = async () => {
    if (!vat?.trim()) return;
    setChecking(true);
    let result: VatCheckResult;
    try {
      result = (await validateVatNumber(vat)).result;
    } catch {
      result = "unavailable";
    } finally {
      setChecking(false);
    }
    const message = p(MESSAGE[result]);
    if (result === "valid") toast.success(message);
    else if (result === "unavailable") toast.warning(message);
    else toast.error(message);
  };

  return (
    <Button type="button" variant="outline" size="sm" disabled={checking || !vat?.trim()} onClick={check}>
      {p("checkVat")}
    </Button>
  );
}
