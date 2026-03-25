"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";

type Send = {
  id: string;
  email: string;
  status: string;
  opened_at: Date | null;
  clicked_at: Date | null;
  unsubscribed_at: Date | null;
  sent_at: Date | null;
  target: { first_name: string | null; last_name: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  queued: "text-gray-500",
  sent: "text-blue-600",
  delivered: "text-green-600",
  bounced: "text-red-600",
  failed: "text-red-600",
};

export default function RecipientsTable({ sends }: { sends: Send[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = sends.filter((s) => {
    const name =
      `${s.target?.first_name ?? ""} ${s.target?.last_name ?? ""}`.toLowerCase();
    const matchesSearch =
      !search ||
      name.includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Recipients</h2>
      <div className="flex gap-2">
        <Input
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {["all", "queued", "sent", "delivered", "bounced", "failed"].map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Name", "Email", "Status", "Opened", "Clicked", "Bounced"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left font-medium text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2">
                  {s.target
                    ? `${s.target.first_name ?? ""} ${s.target.last_name ?? ""}`.trim() || "—"
                    : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{s.email}</td>
                <td className={`px-3 py-2 font-medium ${STATUS_COLORS[s.status] ?? ""}`}>
                  {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                </td>
                <td className="px-3 py-2">{s.opened_at ? "✓" : "–"}</td>
                <td className="px-3 py-2">{s.clicked_at ? "✓" : "–"}</td>
                <td className="px-3 py-2">{s.status === "bounced" ? "✓" : "–"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No recipients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {sends.length} recipients
      </p>
    </div>
  );
}
