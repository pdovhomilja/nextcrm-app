"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCandidate } from "@/actions/hrm/candidates";
import { EMPLOYMENT_LABELS, EMPLOYMENT_TYPES } from "@/lib/hrm/employment";

export function NewCandidateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setError(null);
        try {
          const result = await createCandidate({
            fullName: String(data.get("fullName") ?? ""),
            email: String(data.get("email") ?? ""),
            jobTitle: String(data.get("jobTitle") ?? ""),
            employmentType: String(data.get("employmentType") ?? ""),
          });
          if ("error" in result) {
            setError(result.error);
            return;
          }
          router.push(`/hrm/${result.id}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="fullName">Name</Label>
        <Input id="fullName" name="fullName" required placeholder="Candidate name" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="name@email.com" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="jobTitle">Role</Label>
        <Input id="jobTitle" name="jobTitle" placeholder="Engineer, designer…" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="employmentType">Employment type</Label>
        <select
          id="employmentType"
          name="employmentType"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue="full_time"
        >
          {EMPLOYMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EMPLOYMENT_LABELS[type]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Add candidate"}
        </Button>
      </div>
    </form>
  );
}
