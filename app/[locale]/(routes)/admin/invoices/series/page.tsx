import { prismadb } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeriesTable } from "./_components/SeriesTable";

export default async function InvoiceSeriesPage() {
  const series = await prismadb.invoice_Series.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Series</CardTitle>
        </CardHeader>
        <CardContent>
          <SeriesTable series={JSON.parse(JSON.stringify(series))} />
        </CardContent>
      </Card>
    </div>
  );
}
