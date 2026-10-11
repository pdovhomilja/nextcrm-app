export type ParsedQuoteHeader = {
  fromName: string;
  fromEmail?: string;
  dateLabel?: string;
  sentAt: Date | null;
};

const EMAIL_IN_ANGLE = /<([^<>\s]+@[^<>\s]+)>/;

/** Parses Gmail-style "On Sun, Oct 11, 2026 at 9:23 PM Name <email> wrote" tail. */
export function parseOnWroteLabel(rawLabel: string): ParsedQuoteHeader {
  let label = rawLabel.replace(/\u202f/g, " ").trim();

  const emailMatch = label.match(EMAIL_IN_ANGLE);
  const fromEmail = emailMatch?.[1]?.trim();
  if (emailMatch) {
    label = label.replace(EMAIL_IN_ANGLE, "").trim();
  }

  const dateMatch = label.match(
    /^((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\w{3}\s+\d{1,2},?\s+\d{4}\s+at\s+\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)/i
  );
  const dateLabel = dateMatch?.[1]?.trim();
  if (dateLabel) {
    label = label.slice(dateLabel.length).trim();
  }

  let fromName = label
    .replace(/^[\s:]+/, "")
    .replace(/\s+wrote\s*$/i, "")
    .trim();

  if (!fromName && fromEmail) fromName = fromEmail.split("@")[0] ?? fromEmail;
  if (!fromName) fromName = "Unknown sender";

  let sentAt: Date | null = null;
  if (dateLabel) {
    const tryParse = new Date(dateLabel.replace(/ at /i, " "));
    if (!Number.isNaN(tryParse.getTime())) sentAt = tryParse;
    else {
      const try2 = new Date(dateLabel);
      if (!Number.isNaN(try2.getTime())) sentAt = try2;
    }
  }

  return { fromName, fromEmail, dateLabel, sentAt };
}
