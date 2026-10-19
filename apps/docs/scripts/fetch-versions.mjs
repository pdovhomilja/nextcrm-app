// Builds content/versions/ (gitignored) from the release tags of the public
// repo: one folder per minor version. 0.24+ get apps/docs/content/docs from
// the minor's newest patch tag; older minors get their CHANGELOG.md entries.
// Runs before `next build`; see README.md "Versions".
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pickVersions, pinDocLinks, releaseNotesFor } from './versions.mjs';

const repo = process.env.DOCS_VERSIONS_REPO || 'https://github.com/pdovhomilja/nextcrm-app.git';
const webRepo = repo.replace(/\.git$/, '');
const out = path.join(import.meta.dirname, '..', 'content', 'versions');
const docsDir = 'apps/docs/content/docs';

const git = mkdtempSync(path.join(tmpdir(), 'nextcrm-docs-versions-'));
const run = (...args) =>
  execFileSync('git', ['--git-dir', git, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

try {
  run('init', '-q', '--bare');
  const tags = run('ls-remote', '--tags', '--refs', repo)
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('refs/tags/')[1]);
  const versions = pickVersions(tags);
  if (versions.length === 0) throw new Error(`no release tags found in ${repo}`);

  const docs = versions.filter((v) => v.kind === 'docs');
  const newest = versions[0].tag;
  run('fetch', '-q', '--depth=1', repo, ...docs.map((v) => `refs/tags/${v.tag}:refs/tags/${v.tag}`));

  rmSync(out, { recursive: true, force: true });
  const write = (file, text) => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
  };

  for (const v of docs) {
    for (const file of run('ls-tree', '-r', '--name-only', v.tag, docsDir).split('\n').filter(Boolean)) {
      const rel = file.slice(docsDir.length + 1);
      let text = run('show', `${v.tag}:${file}`);
      if (rel === 'meta.json') {
        text = JSON.stringify({ ...JSON.parse(text), title: v.minor }, null, 2);
      } else if (/\.mdx?$/.test(rel)) {
        text = pinDocLinks(text, v.slug);
      }
      write(path.join(out, v.slug, rel), text);
    }
  }

  const changelog = run('show', `${newest}:CHANGELOG.md`);
  for (const v of versions.filter((v) => v.kind === 'notes')) {
    write(path.join(out, v.slug, 'meta.json'), JSON.stringify({ title: v.minor }, null, 2));
    write(
      path.join(out, v.slug, 'index.md'),
      `---
title: NextCRM ${v.minor} release notes
description: What changed in NextCRM ${v.minor}, from CHANGELOG.md.
---

NextCRM ${v.minor} shipped before this documentation site existed (the docs start at 0.24), so this version has release notes only. They are the ${v.minor} entries of [CHANGELOG.md](${webRepo}/blob/${newest}/CHANGELOG.md), unchanged.

${releaseNotesFor(changelog, v.minor)}
`,
    );
  }

  write(path.join(out, 'meta.json'), JSON.stringify({ pages: versions.map((v) => v.slug) }, null, 2));
  write(path.join(out, 'versions.json'), JSON.stringify({ latest: newest, versions }, null, 2));
  console.log(`docs versions: ${docs.length} with docs, ${versions.length - docs.length} release notes, newest ${newest}`);
} finally {
  rmSync(git, { recursive: true, force: true });
}
