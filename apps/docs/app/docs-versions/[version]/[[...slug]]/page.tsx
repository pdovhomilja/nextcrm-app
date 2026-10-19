import { getVersion, latestMinor, source, versionSource } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { Callout } from 'fumadocs-ui/components/callout';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';

type Props = PageProps<'/docs-versions/[version]/[[...slug]]'>;

async function load(props: Props) {
  const { version: slug, slug: rest = [] } = await props.params;
  const version = getVersion(slug);
  const page = version && versionSource.getPage([slug, ...rest]);
  if (!version || !page) notFound();
  // Release-notes pages have no Latest equivalent.
  const latestPage = version.kind === 'docs' ? source.getPage(rest) : undefined;
  return { version, page, latestPage };
}

export default async function Page(props: Props) {
  const { version, page, latestPage } = await load(props);
  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <Callout type="warn" className="my-0">
        You are viewing docs for {version.minor} ({version.tag}). Latest is {latestMinor}:{' '}
        <Link href={latestPage ? latestPage.url : '/docs'}>{latestPage ? 'this page in Latest' : 'Latest docs'}</Link>.
      </Callout>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(versionSource, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return versionSource.generateParams().map(({ slug }) => ({ version: slug[0], slug: slug.slice(1) }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { version, page, latestPage } = await load(props);
  return {
    title: `${page.data.title} (${version.minor})`,
    description: page.data.description,
    // Older versions never compete with Latest in search engines.
    ...(latestPage ? { alternates: { canonical: latestPage.url } } : { robots: { index: false } }),
  };
}
