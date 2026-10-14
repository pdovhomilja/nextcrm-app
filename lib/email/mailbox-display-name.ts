/** First name (or first token) for compact mailbox UI. */
export function mailboxShortLabel(label: string, maxLen = 11): string {
  const trimmed = label.trim();
  if (!trimmed) return "Mail";
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  if (first.length <= maxLen) return first;
  return `${first.slice(0, Math.max(1, maxLen - 1))}…`;
}
