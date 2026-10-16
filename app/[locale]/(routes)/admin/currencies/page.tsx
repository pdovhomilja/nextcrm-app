import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCurrencies,
  getExchangeRatesAdmin,
  getEcbAutoUpdate,
  getCurrencyApiInfo,
} from "./_actions/currencies";
import { CurrencyTable } from "./_components/CurrencyTable";
import { ExchangeRatesTable } from "./_components/ExchangeRatesTable";
import { ECBToggle } from "./_components/ECBToggle";
import { CurrencyApiSyncPanel } from "./_components/CurrencyApiSyncPanel";

export default async function CurrenciesPage() {
  const [currencies, rates, ecbEnabled, apiInfo] = await Promise.all([
    getCurrencies(),
    getExchangeRatesAdmin(),
    getEcbAutoUpdate(),
    getCurrencyApiInfo(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Currencies & FX Rates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage 171 world fiat currencies and institutional exchange rates. Enable or disable currencies for CRM price lists, quotes, invoices, and contracts.
        </p>
      </div>

      <CurrencyApiSyncPanel apiInfo={apiInfo} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Global Currencies ({currencies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrencyTable currencies={currencies} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Exchange Rates ({rates.length})</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pairwise FX conversion rates used for multi-currency invoices, opportunities, and price lists.
            </p>
          </div>
          <ECBToggle initialEnabled={ecbEnabled} />
        </CardHeader>
        <CardContent>
          <ExchangeRatesTable rates={rates} ecbEnabled={ecbEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
