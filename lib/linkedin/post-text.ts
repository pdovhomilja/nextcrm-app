/** Best-effort text extraction from LinkedIn REST post payloads. */
export function extractLinkedInPostSnippets(elements: unknown[], limit = 10): string[] {
  const out: string[] = [];
  for (const el of elements.slice(0, limit)) {
    const text = snippetFromNode(el);
    if (text) out.push(text.slice(0, 1200));
  }
  return out;
}

function snippetFromNode(node: unknown, depth = 0): string | null {
  if (node == null || depth > 8) return null;
  if (typeof node === "string" && node.trim().length > 12) return node.trim();

  if (typeof node !== "object") return null;
  const record = node as Record<string, unknown>;

  const preferred = ["commentary", "text", "title", "description", "message", "body"];
  for (const key of preferred) {
    const v = record[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object" && "text" in (v as object)) {
      const inner = (v as { text?: unknown }).text;
      if (typeof inner === "string" && inner.trim()) return inner.trim();
    }
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = snippetFromNode(item, depth + 1);
        if (found) return found;
      }
    } else {
      const found = snippetFromNode(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}
