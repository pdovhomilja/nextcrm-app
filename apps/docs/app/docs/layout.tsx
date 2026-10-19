import { source, versions } from '@/lib/source';
import { VersionSwitcher } from '@/components/version-switcher';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions()}
      sidebar={{ banner: <VersionSwitcher current="latest" minors={versions} /> }}
    >
      {children}
    </DocsLayout>
  );
}
