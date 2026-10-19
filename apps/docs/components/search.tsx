'use client';

import DefaultSearchDialog from 'fumadocs-ui/components/dialog/search-default';
import type { SharedProps } from 'fumadocs-ui/components/dialog/search';
import { usePathname } from 'next/navigation';

// Search only the version being read: /docs/v0.35/... searches 0.35, the rest searches Latest.
export default function SearchDialog(props: SharedProps) {
  const version = /^\/docs\/(v\d+\.\d+)(?:\/|$)/.exec(usePathname())?.[1];
  return <DefaultSearchDialog key={version ?? 'latest'} defaultTag={version} {...props} />;
}
