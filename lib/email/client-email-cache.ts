type EmailDetail = {
  id: string;
  bodyText?: string | null;
  bodyHtml?: string | null;
  imapUid?: number | null;
  [key: string]: unknown;
} | null;

const cache = new Map<string, Promise<EmailDetail>>();

async function loadEmailDetail(id: string): Promise<EmailDetail> {
  const res = await fetch(`/api/emails/${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load email");
  return res.json() as Promise<EmailDetail>;
}

/** Dedupe message detail fetches (Route Handler — stays off RSC navigation path). */
export function fetchEmailDetail(id: string): Promise<EmailDetail> {
  const existing = cache.get(id);
  if (existing) return existing;
  const promise = loadEmailDetail(id);
  cache.set(id, promise);
  promise.catch(() => {
    cache.delete(id);
  });
  return promise;
}

export function primeEmailDetail(id: string) {
  void fetchEmailDetail(id);
}

export function invalidateEmailDetail(id: string) {
  cache.delete(id);
}
