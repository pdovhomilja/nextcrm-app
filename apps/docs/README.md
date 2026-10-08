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
