import { canvaFetch } from "@/lib/canva/client";

export type CanvaDesignSummary = {
  id: string;
  title: string;
  editUrl: string | null;
  thumbnailUrl: string | null;
  updatedAt: number | null;
};

type DesignItem = {
  id: string;
  title?: string;
  urls?: { edit_url?: string };
  thumbnail?: { url?: string };
  updated_at?: number;
};

function mapDesign(item: DesignItem): CanvaDesignSummary {
  return {
    id: item.id,
    title: item.title?.trim() || "Untitled design",
    editUrl: item.urls?.edit_url ?? `https://www.canva.com/design/${item.id}/edit`,
    thumbnailUrl: item.thumbnail?.url ?? null,
    updatedAt: item.updated_at ?? null,
  };
}

export async function createEmailDesign(userId: string, title: string) {
  const json = (await canvaFetch(userId, "/designs", {
    method: "POST",
    body: JSON.stringify({
      title: title.slice(0, 255) || "CRM email design",
      design_type: { type: "custom", width: 600, height: 900 },
    }),
  })) as { design: DesignItem };
  return mapDesign(json.design);
}

export async function listCanvaDesigns(userId: string): Promise<CanvaDesignSummary[]> {
  const json = (await canvaFetch(userId, "/designs?sort_by=modified_descending")) as {
    items?: DesignItem[];
  };
  return (json.items ?? []).slice(0, 12).map(mapDesign);
}

async function waitForExport(userId: string, jobId: string) {
  for (let i = 0; i < 12; i++) {
    const json = (await canvaFetch(userId, `/exports/${encodeURIComponent(jobId)}`)) as {
      job: { status: string; urls?: string[]; error?: { message?: string } };
    };
    if (json.job.status === "success") return json.job.urls ?? [];
    if (json.job.status === "failed") {
      throw new Error(json.job.error?.message || "Canva export failed");
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Canva export is still running. Try again in a moment.");
}

export async function exportDesign(
  userId: string,
  designId: string,
  format: "png" | "pdf" | "html_standalone"
): Promise<string[]> {
  const json = (await canvaFetch(userId, "/exports", {
    method: "POST",
    body: JSON.stringify({
      design_id: designId,
      format: { type: format },
    }),
  })) as { job: { id: string; status: string; urls?: string[] } };

  if (json.job.status === "success" && json.job.urls?.length) return json.job.urls;
  return waitForExport(userId, json.job.id);
}

export async function fetchExportedHtml(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not download the Canva HTML export");
  return res.text();
}
