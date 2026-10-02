"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

export function PromptList({ prompts, isAdmin }: { prompts: Prompt[]; isAdmin: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [creating, setCreating] = useState(false);

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
      <Button onClick={() => setCreating(true)} data-testid="prompt-new">
        New prompt
      </Button>
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
          {prompts.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="py-2">{p.name}</td>
              <td>{HOMEPAGE_LAYER_KIND_LABELS[p.kind] ?? p.kind}</td>
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
