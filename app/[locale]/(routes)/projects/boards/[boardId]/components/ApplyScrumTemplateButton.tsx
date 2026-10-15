"use client";

import { useState } from "react";
import { LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { applyBoardTemplate } from "@/actions/projects/apply-board-template";
import { SCRUM_BOARD_SECTIONS } from "@/lib/projects/board-templates";
import { Button } from "@/components/ui/button";

type Props = {
  boardId: string;
  sectionCount: number;
};

export function ApplyScrumTemplateButton({ boardId, sectionCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (sectionCount >= SCRUM_BOARD_SECTIONS.length) return null;

  const onApply = async () => {
    setLoading(true);
    try {
      const result = await applyBoardTemplate(boardId, "scrum");
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      const added = result.data?.added ?? 0;
      if (added === 0) {
        toast.message("Scrum columns are already on this board.");
      } else {
        toast.success(`Added ${added} column${added === 1 ? "" : "s"} (Scrum template).`);
      }
      router.refresh();
    } catch {
      toast.error("Could not apply board template.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={onApply}
      className="gap-2"
    >
      <LayoutTemplate className="h-4 w-4" />
      {loading ? "Applying…" : "Add Scrum columns"}
    </Button>
  );
}
