import { source, versionSource } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

const latest = createFromSource(source);
// Older versions are searched only with ?tag=v0.35 (the dialog sends the open version).
const versions = createFromSource(versionSource, {
  buildIndex: (page) => ({
    title: page.data.title ?? page.slugs.join('/'),
    description: page.data.description,
    url: page.url,
    id: page.url,
    structuredData: page.data.structuredData,
    tag: page.slugs[0],
  }),
});

export function GET(request: Request) {
  return new URL(request.url).searchParams.get('tag') ? versions.GET(request) : latest.GET(request);
}
