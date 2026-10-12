import { parseOnWroteLabel, type ParsedQuoteHeader } from "./parse-on-wrote-label";

export type ThreadPart = {
  kind: "message" | "quote" | "forward";
  body: string;
  depth: number;
  header?: ParsedQuoteHeader;
};

/** Gmail / Apple Mail — use [\s\S] so name + `<email>` before `wrote:` is captured. */
const ON_WROTE_LINE =
  /(?:^|\n)\s*On\s+([\s\S]+?)\s+wrote:\s*(?:\n|$)/i;

const FORWARDED_BLOCK =
  /(?:^|\n)\s*-{3,}\s*Forwarded message\s*-{3,}\s*\n/i;

export function plainTextHasQuoteMarkers(text: string): boolean {
  return ON_WROTE_LINE.test(text) || FORWARDED_BLOCK.test(text);
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\u2028/g, "\n").replace(/\u202f/g, " ");
}

function cleanQuoteBody(body: string): string {
  return body
    .split("\n")
    .map((line) => line.replace(/^>\s?/, ""))
    .join("\n")
    .replace(/(?:^|\n)\s*On\s+[\s\S]+?\s+wrote:\s*(?:\n|$)/gi, "")
    .trim();
}

type Split = {
  index: number;
  length: number;
  kind: "forward" | "quote";
  label?: string;
};

function findNextSplit(text: string): Split | null {
  const forward = text.match(FORWARDED_BLOCK);
  const onWrote = text.match(ON_WROTE_LINE);

  let forwardAt = forward?.index ?? -1;
  let onWroteAt = onWrote?.index ?? -1;
  if (forwardAt >= 0 && forward?.[0].startsWith("\n")) forwardAt += 1;
  if (onWroteAt >= 0 && onWrote?.[0].startsWith("\n")) onWroteAt += 1;

  const candidates: Split[] = [];
  if (forward && forwardAt >= 0) {
    candidates.push({
      index: forwardAt,
      length: forward[0].length - (forward[0].startsWith("\n") ? 1 : 0),
      kind: "forward",
    });
  }
  if (onWrote && onWroteAt >= 0) {
    candidates.push({
      index: onWroteAt,
      length: onWrote[0].length - (onWrote[0].startsWith("\n") ? 1 : 0),
      kind: "quote",
      label: onWrote[1].trim(),
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0];
}

export function parsePlainTextThread(raw: string, depth = 0): ThreadPart[] {
  const text = normalizeNewlines(raw).trim();
  if (!text) return [];

  const cut = findNextSplit(text);
  if (!cut) {
    return [{ kind: "message", body: cleanQuoteBody(text), depth }];
  }

  const head = text.slice(0, cut.index).trim();
  const tail = text.slice(cut.index + cut.length).trim();

  const out: ThreadPart[] = [];
  if (head) {
    out.push({ kind: "message", body: cleanQuoteBody(head), depth });
  }

  const sub = parsePlainTextThread(tail, depth + 1);
  const kind = cut.kind === "forward" ? "forward" : "quote";
  const header =
    cut.kind === "quote" && cut.label
      ? parseOnWroteLabel(cut.label)
      : cut.kind === "forward"
        ? { fromName: "Forwarded message", sentAt: null as Date | null }
        : undefined;

  if (sub.length === 0) {
    out.push({
      kind,
      body: cleanQuoteBody(tail),
      depth: depth + 1,
      header,
    });
    return out;
  }

  const [first, ...rest] = sub;
  out.push({
    kind,
    body: cleanQuoteBody(first.body),
    depth: depth + 1,
    header,
  });
  out.push(...rest);
  return out;
}
