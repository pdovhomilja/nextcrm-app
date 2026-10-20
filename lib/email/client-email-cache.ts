import { getEmail } from "@/actions/emails/messages";

type EmailDetail = Awaited<ReturnType<typeof getEmail>>;

const cache = new Map<string, Promise<EmailDetail>>();

/** Dedupe open/prefetch server fetches for the same message in one session. */
export function fetchEmailDetail(id: string): Promise<EmailDetail> {
  const existing = cache.get(id);
  if (existing) return existing;
  const promise = getEmail(id);
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
