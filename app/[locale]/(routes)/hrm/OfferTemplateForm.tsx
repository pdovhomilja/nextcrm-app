"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveOfferTemplateId } from "@/actions/hrm/candidates";

export function OfferTemplateForm({ initialId }: { initialId: string }) {
  const [value, setValue] = useState(initialId);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setSaved(false);
        try {
          await saveOfferTemplateId(value);
          setSaved(true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Canva brand template id"
        aria-label="Canva offer letter template id"
      />
      <Button type="submit" variant="secondary" disabled={busy}>
        {busy ? "Saving…" : saved ? "Saved" : "Save letterhead"}
      </Button>
    </form>
  );
}
