"use client";
import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminFiltersProps {
  entityType?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function AdminFilters({
  entityType,
  action,
  dateFrom,
  dateTo,
}: AdminFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const apply = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set("page", "1"); // reset page on filter change
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    // apply overrides
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const clear = () => router.push(pathname);

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <Select
        value={entityType ?? "all"}
        onValueChange={(v) => apply({ entityType: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Entity type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All entities</SelectItem>
          <SelectItem value="account">Account</SelectItem>
          <SelectItem value="contact">Contact</SelectItem>
          <SelectItem value="lead">Lead</SelectItem>
          <SelectItem value="opportunity">Opportunity</SelectItem>
          <SelectItem value="contract">Contract</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={action ?? "all"}
        onValueChange={(v) => apply({ action: v === "all" ? "" : v })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All actions</SelectItem>
          <SelectItem value="created">Created</SelectItem>
          <SelectItem value="updated">Updated</SelectItem>
          <SelectItem value="deleted">Deleted</SelectItem>
          <SelectItem value="restored">Restored</SelectItem>
          <SelectItem value="relation_added">Relation added</SelectItem>
          <SelectItem value="relation_removed">Relation removed</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          className="w-36"
          value={dateFrom ?? ""}
          onChange={(e) => apply({ dateFrom: e.target.value })}
          placeholder="From"
        />
        <span className="text-muted-foreground text-sm">to</span>
        <Input
          type="date"
          className="w-36"
          value={dateTo ?? ""}
          onChange={(e) => apply({ dateTo: e.target.value })}
          placeholder="To"
        />
      </div>

      {(entityType || action || dateFrom || dateTo) && (
        <Button variant="ghost" size="sm" onClick={clear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
