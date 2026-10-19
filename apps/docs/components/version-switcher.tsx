'use client';

import { usePathname } from 'next/navigation';

// Version picker in the sidebar. The /docs-switch route keeps the reader on the
// same page when the target version has it, else opens that version's index.
export function VersionSwitcher({ current, minors }: { current: string; minors: { slug: string; minor: string }[] }) {
  const pathname = usePathname();
  if (minors.length === 0) return null;
  return (
    <label className="flex items-center gap-2 text-sm text-fd-muted-foreground">
      Version
      <select
        className="flex-1 rounded-md border bg-fd-secondary px-2 py-1.5 text-fd-foreground"
        value={current}
        onChange={(e) =>
          window.location.assign(
            `/docs-switch?to=${encodeURIComponent(e.target.value)}&from=${encodeURIComponent(pathname)}`,
          )
        }
      >
        <option value="latest">Latest</option>
        {minors.map((v) => (
          <option key={v.slug} value={v.slug}>
            {v.minor}
          </option>
        ))}
      </select>
    </label>
  );
}
