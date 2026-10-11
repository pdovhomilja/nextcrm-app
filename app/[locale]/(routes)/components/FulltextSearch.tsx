"use client";

import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const FulltextSearch = () => {
  const [search, setSearch] = useState("");
  const router = useRouter();

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = search.trim();
    if (!q) return;
    router.push(`/fulltext-search?q=${encodeURIComponent(q)}`);
    setSearch("");
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search records, docs, people…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9 border-border/60 bg-muted/30 pl-9 pr-3 shadow-none focus-visible:bg-background"
      />
    </form>
  );
};

export default FulltextSearch;
