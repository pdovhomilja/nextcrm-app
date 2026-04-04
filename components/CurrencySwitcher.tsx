"use client";

import { useCurrency } from "@/context/currency-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CurrencySwitcher() {
  const { displayCurrency, currencies, setDisplayCurrency } = useCurrency();
  const current = currencies.find((c) => c.code === displayCurrency);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs font-medium">
          <span>{current?.symbol ?? "$"}</span>
          <span>{displayCurrency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {currencies.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setDisplayCurrency(c.code)}
            className={c.code === displayCurrency ? "bg-accent" : ""}
          >
            <span className="w-6 text-center">{c.symbol}</span>
            <span className="font-medium">{c.code}</span>
            <span className="ml-auto text-xs text-muted-foreground">{c.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
