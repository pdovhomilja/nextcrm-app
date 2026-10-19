import { getVersion, switchVersionUrl } from '@/lib/source';

export function GET(request: Request) {
  const url = new URL(request.url);
  const to = url.searchParams.get('to') ?? 'latest';
  const from = url.searchParams.get('from') ?? '/docs';
  const target = to === 'latest' || getVersion(to) ? switchVersionUrl(from, to) : '/docs';
  // Relative Location: behind the proxy request.url carries the container's host, not docs.nextcrm.app.
  return new Response(null, { status: 307, headers: { Location: target } });
}
