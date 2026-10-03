import { getHomepageCostsForAdmin } from "@/actions/admin/homepage-costs";

const money = (n: number) => `$${n.toFixed(2)}`;
const tokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const date = (d: Date | null) => (d ? new Date(d).toLocaleString() : "—");

export default async function HomepageCostsPage() {
  const res = await getHomepageCostsForAdmin();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Homepage Costs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Accumulated homepage-generation cost per target, across every generation and refine
          iteration. Costs are recorded from when tracking was enabled; earlier passes show $0.00.
        </p>
      </div>

      {"error" in res ? (
        <p className="text-sm text-destructive">{res.error}</p>
      ) : res.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No homepage generations yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">Last generation</th>
                <th className="px-3 py-2 font-medium text-right"># gens</th>
                <th className="px-3 py-2 font-medium">Model</th>
                <th className="px-3 py-2 font-medium text-right">Total cost</th>
                <th className="px-3 py-2 font-medium text-right text-muted-foreground">
                  Tokens (in/out)
                </th>
              </tr>
            </thead>
            <tbody>
              {res.data.map((r) => (
                <tr key={r.targetId} className="border-t">
                  <td className="px-3 py-2">{r.company}</td>
                  <td className="px-3 py-2">{date(r.summary.lastGenerationAt)}</td>
                  <td className="px-3 py-2 text-right">{r.summary.generations}</td>
                  <td className="px-3 py-2">
                    {r.summary.model ?? "—"}
                    {r.summary.modelCount > 1 ? ` (+${r.summary.modelCount - 1})` : ""}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {money(r.summary.totalCostUsd)}
                    {r.summary.hasUntracked ? (
                      <span className="ml-1 text-xs text-muted-foreground">(pre-tracking)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {tokens(r.summary.inputTokens)} / {tokens(r.summary.outputTokens)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
