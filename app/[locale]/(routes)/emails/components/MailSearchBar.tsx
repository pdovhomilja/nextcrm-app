"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function MailSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("search") ?? "";
  const [value, setValue] = useState(initial);

  useEffect(() => {
    setValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  function apply(next: string) {
    const p = new URLSearchParams(searchParams.toString());
    const q = next.trim();
    if (q.length >= 2) p.set("search", q);
    else p.delete("search");
    p.delete("page");
    router.push(`?${p.toString()}`);
  }

  return (
    <div className="relative flex gap-1">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply(value);
        }}
        placeholder="Search mail…"
        className="h-9 rounded-full border-border/60 bg-muted/30 pl-8 text-sm shadow-none focus-visible:ring-primary/30"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={() => {
            setValue("");
            apply("");
          }}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
