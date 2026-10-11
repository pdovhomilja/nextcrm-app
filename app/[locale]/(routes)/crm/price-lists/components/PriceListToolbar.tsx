"use client";

import { DisplayCurrencyPicker } from "@/components/CurrencySwitcher";

type Props = {
  archivedLink: React.ReactNode;
  actions?: React.ReactNode;
};

export function PriceListToolbar({ archivedLink, actions }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {archivedLink}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Display currency</span>
          <DisplayCurrencyPicker />
        </div>
      </div>
      {actions}
    </div>
  );
}
