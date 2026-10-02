"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deletePrompt } from "@/actions/crm/prompts/delete-prompt";
import { PromptDialog } from "./PromptDialog";
import { HOMEPAGE_LAYER_KIND_LABELS, type AiPromptKind } from "@/actions/crm/prompts/kinds";

type Prompt = {
  id: string;
  name: string;
  body: string;
  kind: AiPromptKind;
  scope: "ORG" | "USER";
};

// Sentinel for the "All kinds" filter row (Radix <SelectItem> forbids "").
const KIND_ALL = "__all__";
// Canonical display order, mirroring the prompts page's grouping; the filter
// only lists kinds actually present so it never offers an empty bucket.
const KIND_ORDER: AiPromptKind[] = [
  "HOMEPAGE_BASE",
  "HOMEPAGE_INDUSTRY",
  "HOMEPAGE_STYLE",
  "HOMEPAGE_AVOID",
  "EMAIL",
  "HOMEPAGE",
];
const kindLabel = (k: AiPromptKind) => HOMEPAGE_LAYER_KIND_LABELS[k] ?? k;

export function PromptList({ prompts, isAdmin }: { prompts: Prompt[]; isAdmin: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [creating, setCreating] = useState(false);
  const [kindFilter, setKindFilter] = useState<AiPromptKind | typeof KIND_ALL>(
    KIND_ALL,
  );

  // Kinds present in the data, in canonical order — the filter's option list.
  const kindsPresent = useMemo(() => {
    const present = new Set(prompts.map((p) => p.kind));
    return KIND_ORDER.filter((k) => present.has(k));
  }, [prompts]);

  const visiblePrompts =
    kindFilter === KIND_ALL
      ? prompts
      : prompts.filter((p) => p.kind === kindFilter);

  async function onDelete(id: string) {
    try {
      const res = await deletePrompt({ id });
      if ("error" in res) toast.error(res.error);
      else {
        toast.success("Prompt deleted");
        router.refresh();
      }
    } catch {
      toast.error("Failed to delete prompt");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button onClick={() => setCreating(true)} data-testid="prompt-new">
          New prompt
        </Button>
        <Select
          value={kindFilter}
          onValueChange={(v) => setKindFilter(v as AiPromptKind | typeof KIND_ALL)}
        >
          <SelectTrigger
            className="w-56"
            data-testid="prompt-kind-filter"
            aria-label="Filter by kind"
          >
            <SelectValue placeholder="All kinds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={KIND_ALL}>All kinds</SelectItem>
            {kindsPresent.map((k) => (
              <SelectItem key={k} value={k}>
                {kindLabel(k)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Name</th>
            <th>Kind</th>
            <th>Scope</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visiblePrompts.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="py-2">{p.name}</td>
              <td>{kindLabel(p.kind)}</td>
              <td>{p.scope}</td>
              <td className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit ${p.name}`}
                  onClick={() => setEditing(p)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => onDelete(p.id)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {creating && (
        <PromptDialog
          isAdmin={isAdmin}
          onClose={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
      {editing && (
        <PromptDialog
          prompt={editing}
          isAdmin={isAdmin}
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
