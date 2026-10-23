"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importCanvaDesign, startCanvaDesign } from "@/actions/canva/designs";

type Props = {
  connected: boolean;
  defaultTitle: string;
  onImported: (html: string) => void;
};

export function CanvaDesignPanel({ connected, defaultTitle, onImported }: Props) {
  const [title, setTitle] = useState(defaultTitle);
  const [designId, setDesignId] = useState("");
  const [busy, setBusy] = useState<"create" | "image" | "html" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState<string | null>(null);

  if (!connected) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Connect Canva to design this email visually, then import it here.{" "}
        <button
          type="button"
          className="font-medium text-primary underline"
          onClick={() => {
            const path = `${window.location.pathname}${window.location.search}`;
            window.location.href = `/api/canva/oauth?return=${encodeURIComponent(path)}`;
          }}
        >
          Connect Canva
        </button>
      </div>
    );
  }

  async function create() {
    setBusy("create");
    setError(null);
    try {
      const design = await startCanvaDesign(title || defaultTitle || "CRM email design");
      setDesignId(design.id);
      setEditUrl(design.editUrl);
      if (design.editUrl) window.open(design.editUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the Canva design");
    } finally {
      setBusy(null);
    }
  }

  async function pull(mode: "image" | "html") {
    setBusy(mode);
    setError(null);
    try {
      const result = await importCanvaDesign(designId, mode);
      onImported(result.html);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import the design");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div>
        <h3 className="text-sm font-semibold">Design in Canva</h3>
        <p className="text-xs text-muted-foreground">
          Opens a 600×900 email design in Canva. When you are done, import it as an image or as HTML.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="canva-title">Design title</Label>
        <Input id="canva-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Welcome email" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={create} disabled={busy !== null}>
          {busy === "create" ? "Creating…" : "Create in Canva"}
        </Button>
        {editUrl && (
          <Button type="button" variant="outline" asChild>
            <a href={editUrl} target="_blank" rel="noreferrer">
              Reopen editor
            </a>
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="canva-id">Design id</Label>
        <Input
          id="canva-id"
          value={designId}
          onChange={(e) => setDesignId(e.target.value)}
          placeholder="Filled in after you create a design"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => pull("image")} disabled={!designId || busy !== null}>
          {busy === "image" ? "Importing…" : "Insert as image"}
        </Button>
        <Button type="button" onClick={() => pull("html")} disabled={!designId || busy !== null}>
          {busy === "html" ? "Importing…" : "Replace body with HTML"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
