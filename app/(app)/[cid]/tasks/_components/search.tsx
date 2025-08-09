"use client";

import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { startTransition } from "react";
import { useQueryState } from "nuqs";

export const Search = () => {
  const [q, setQ] = useQueryState("q", {
    shallow: false,
    startTransition,
    clearOnDefault: true,
    defaultValue: "",
  });

  return (
    <div className="flex items-center gap-2">
      <SearchIcon className="w-4 h-4" />
      <Input
        placeholder="Search boards..."
        className="w-full"
        value={q ?? ""}
        onChange={(e) => setQ(e.target.value)}
      />
    </div>
  );
};
