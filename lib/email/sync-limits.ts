/** Max messages imported per folder on first sync (newest first in the search window). */
export const EMAIL_INITIAL_IMPORT_MAX = 150;

/** Max new UIDs processed per folder on each sync run (avoids huge Inngest steps). */
export const EMAIL_SYNC_BATCH_MAX = 100;

/** First-time IMAP search window — keep smaller than full history for fast onboarding. */
export const EMAIL_FIRST_SYNC_SINCE_MS = 14 * 24 * 60 * 60 * 1000;

export function capImapUids(uids: number[], lastUid: number, max: number): number[] {
  if (uids.length <= max) return uids;
  const sorted = [...uids].sort((a, b) => a - b);
  if (lastUid === 0) return sorted.slice(-max);
  return sorted.slice(0, max);
}
