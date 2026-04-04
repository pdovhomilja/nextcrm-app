"use client";

import { createContext, useContext, useState, useCallback, useTransition } from "react";

type CurrencyInfo = {
  code: string;
  symbol: string;
  name: string;
};

type CurrencyContextValue = {
  displayCurrency: string;
  currencies: CurrencyInfo[];
  setDisplayCurrency: (code: string) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  children,
  initialCurrency,
  currencies,
}: {
  children: React.ReactNode;
  initialCurrency: string;
  currencies: CurrencyInfo[];
}) {
  const [displayCurrency, setDisplayCurrencyState] = useState(initialCurrency);
  const [, startTransition] = useTransition();

  const setDisplayCurrency = useCallback(
    (code: string) => {
      setDisplayCurrencyState(code);
      document.cookie = `display_currency=${code};path=/;max-age=${60 * 60 * 24 * 365}`;
      startTransition(() => {
        window.location.reload();
      });
    },
    []
  );

  return (
    <CurrencyContext.Provider
      value={{ displayCurrency, currencies, setDisplayCurrency }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
