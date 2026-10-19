import { getVersion, getVersionTree, versions } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { VersionSwitcher } from '@/components/version-switcher';
import { notFound } from 'next/navigation';

// Older versions: /docs/v0.35/... is rewritten here (next.config.mjs), so each
// version gets its own sidebar tree instead of every page carrying all of them.
export default async function Layout({ children, params }: LayoutProps<'/docs-versions/[version]'>) {
  const { version } = await params;
  if (!getVersion(version)) notFound();
  return (
    <DocsLayout
      tree={getVersionTree(version)}
      {...baseOptions()}
      sidebar={{ banner: <VersionSwitcher current={version} minors={versions} /> }}
    >
      {children}
    </DocsLayout>
  );
}
