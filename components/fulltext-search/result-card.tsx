"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/actions/fulltext/unified-search";

const matchTypeLabel: Record<SearchResult["matchType"], string> = {
  keyword: "Keyword",
  semantic: "Semantic",
  both: "Best Match",
};

const matchTypeVariant: Record<
  SearchResult["matchType"],
  "default" | "secondary" | "outline"
> = {
  keyword: "outline",
  semantic: "secondary",
  both: "default",
};

export function ResultCard({ result }: { result: SearchResult }) {
  return (
    <Link
      href={result.url}
      className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm hover:bg-muted/50 transition-colors"
    >
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-medium truncate">{result.title}</span>
        {result.subtitle && (
          <span className="text-muted-foreground text-xs truncate">
            {result.subtitle}
          </span>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge variant={matchTypeVariant[result.matchType]}>
          {matchTypeLabel[result.matchType]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {Math.round(result.score * 100)}%
        </span>
      </div>
    </Link>
  );
}
