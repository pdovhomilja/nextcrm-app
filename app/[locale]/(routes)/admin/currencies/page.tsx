import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrencies, getExchangeRatesAdmin, getEcbAutoUpdate } from "./_actions/currencies";
import { CurrencyTable } from "./_components/CurrencyTable";
import { ExchangeRatesTable } from "./_components/ExchangeRatesTable";
import { ECBToggle } from "./_components/ECBToggle";

export default async function CurrenciesPage() {
  const [currencies, rates, ecbEnabled] = await Promise.all([
    getCurrencies(),
    getExchangeRatesAdmin(),
    getEcbAutoUpdate(),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Currencies</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrencyTable currencies={currencies} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Exchange Rates</CardTitle>
          <ECBToggle initialEnabled={ecbEnabled} />
        </CardHeader>
        <CardContent>
          <ExchangeRatesTable rates={rates} ecbEnabled={ecbEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
