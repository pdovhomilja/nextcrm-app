import { prismadb } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaxRatesTable } from "./_components/TaxRatesTable";
import { requireRole } from "@/lib/authz";

export default async function TaxRatesPage() {
  await requireRole(["admin"]);
  const rates = await prismadb.invoice_TaxRates.findMany({
    orderBy: { rate: "desc" },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <TaxRatesTable rates={JSON.parse(JSON.stringify(rates))} />
        </CardContent>
      </Card>
    </div>
  );
}
