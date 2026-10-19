# NextCRM docs

Source of [docs.nextcrm.app](https://docs.nextcrm.app), built with [Fumadocs](https://fumadocs.dev) on Next.js.

```bash
cd apps/docs
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
```

Pages live in `content/docs/` as MDX, one folder per audience (`users/`, `admins/`, `developers/`). Each folder's `meta.json` sets the sidebar order.

The site deploys from its own `Dockerfile` in this folder (build context `apps/docs`).

## Versions

The sidebar has a version picker: **Latest** (this folder, i.e. `main`) and one entry per minor release (0.36, 0.35, …). Nothing has to be done after a release; the next docs build picks up the new tag.

- `pnpm build` first runs `scripts/fetch-versions.mjs`. It lists the release tags of the public repo (`git ls-remote`, override the repo with `DOCS_VERSIONS_REPO`), takes the newest patch tag of each minor, and writes `content/versions/` (gitignored):
  - 0.24 and newer: `apps/docs/content/docs` from that tag, with absolute `/docs/...` links pointed at the same version.
  - 0.1–0.23 (before the docs existed): one page with that minor's `CHANGELOG.md` entries, unchanged.
- URLs: Latest stays at `/docs/...`; a version is `/docs/v0.35/...`. `next.config.mjs` rewrites those to `app/docs-versions/[version]`, which has its own sidebar per version. `/docs-switch` keeps the reader on the same page when the target version has it, else opens that version's first page.
- Older pages show a banner, point their canonical URL at the same page in Latest (or are `noindex` when Latest has no such page), and search only their own version. `llms.txt`, `llms-full.txt`, the Markdown copies and OG images are Latest only.
- Local: `pnpm dev` shows Latest only until you run `pnpm versions` once. `pnpm test` runs the tests of the version logic (`scripts/versions.test.mjs`).
- A release tag is created a moment after the release PR merges, so the build triggered by that merge may not see it yet. Latest already shows that content; the new minor joins the picker on the next docs deploy.
