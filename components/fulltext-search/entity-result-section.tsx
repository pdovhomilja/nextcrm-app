"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResultCard } from "./result-card";
import type { SearchResult } from "@/actions/fulltext/unified-search";

interface EntityResultSectionProps {
  label: string;
  results: SearchResult[];
}

export function EntityResultSection({ label, results }: EntityResultSectionProps) {
  const [open, setOpen] = useState(true);

  if (results.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="ghost"
        className="flex items-center gap-2 w-fit px-1 h-auto py-1"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span className="font-semibold text-sm">{label}</span>
        <Badge variant="secondary" className="text-xs">
          {results.length}
        </Badge>
      </Button>
      {open && (
        <div className="flex flex-col gap-1 pl-6">
          {results.map((r) => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
