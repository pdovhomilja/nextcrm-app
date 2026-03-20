"use client";

import { useSearchParams, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EntityResultSection } from "@/components/fulltext-search/entity-result-section";
import {
  unifiedSearch,
  type UnifiedSearchResults,
} from "@/actions/fulltext/unified-search";

const ENTITY_LABELS: Record<keyof UnifiedSearchResults, string> = {
  accounts: "Accounts",
  contacts: "Contacts",
  leads: "Leads",
  opportunities: "Opportunities",
  projects: "Projects",
  tasks: "Tasks",
  users: "Users",
};

const ENTITY_ORDER: (keyof UnifiedSearchResults)[] = [
  "accounts",
  "contacts",
  "leads",
  "opportunities",
  "projects",
  "tasks",
  "users",
];

export default function SearchResult() {
  const searchParams = useSearchParams();
  const params = useParams();
  const query = searchParams?.get("q") ?? "";
  const locale = (params?.locale as string) ?? "en";

  const [results, setResults] = useState<UnifiedSearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }
    setIsLoading(true);
    unifiedSearch(query.trim(), locale)
      .then((res) => {
        if ("error" in res) {
          console.error("[UNIFIED_SEARCH]", res.error);
          return;
        }
        setResults(res);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [query, locale]);

  if (!query)
    return <p className="text-muted-foreground">Enter a search term above.</p>;

  if (query.trim().length < 2)
    return (
      <p className="text-muted-foreground text-sm">
        Type at least 2 characters to search.
      </p>
    );

  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        {ENTITY_ORDER.map((key) => (
          <div key={key} className="h-16 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );

  if (!results) return null;

  const hasAnyResults = ENTITY_ORDER.some((key) => results[key].length > 0);

  if (!hasAnyResults)
    return (
      <p className="text-muted-foreground">
        No results found for &quot;{query}&quot;.
      </p>
    );

  return (
    <div className="flex flex-col gap-6">
      {ENTITY_ORDER.map((key) => (
        <EntityResultSection
          key={key}
          label={ENTITY_LABELS[key]}
          results={results[key]}
        />
      ))}
    </div>
  );
}
