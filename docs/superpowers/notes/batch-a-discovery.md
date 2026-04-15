# Batch A Discovery Notes

## Sidebar navigation

- **Sidebar composition file**: `app/[locale]/(routes)/components/app-sidebar.tsx`
  - Builds a `navItems` array by calling `get*MenuItem({ ... })` helpers.
  - Admin-only items are pushed conditionally when `session?.user?.role === "admin"`.
- **Per-module menu helpers live in**: `app/[locale]/(routes)/components/menu-items/`
  - Examples: `Dashboard.tsx`, `Crm.tsx`, `Projects.tsx`, `Emails.tsx`, `Reports.tsx`, `Documents.tsx`, `Administration.tsx`, `Campaigns.tsx`.
- **NavItem shape** (from `app/[locale]/(routes)/components/nav-main.tsx`, imported by helpers):
  - Simple item (as used by Documents):
    ```ts
    {
      title: string,        // display label (already localized, plain string)
      url: string,          // e.g. "/documents"
      icon: LucideIcon,     // e.g. FileText from "lucide-react"
    }
    ```
  - Collapsible group (as used by CRM): adds `items: { title, url }[]` and optional `isActive`.
- **i18n pattern**: labels are **plain strings**, not i18n keys. The helper receives `title` pre-resolved from the `dict` object (e.g. `dict?.documents || "Documents"`). Callers read from `dict` in `app-sidebar.tsx` and pass the resolved string to the helper. Dictionary files live under `dictionaries/` (look up the `documents`, `crm`, etc. keys to add `invoices`).
- **Adding a new Invoices entry** will mean:
  1. Create `app/[locale]/(routes)/components/menu-items/Invoices.tsx` following `Documents.tsx` as a template.
  2. Add `invoices` key to each dictionary file under `dictionaries/`.
  3. Import and push into `navItems` in `app-sidebar.tsx`.

## MinIO helpers

- **File**: `lib/minio.ts`
- **Exports** (already present, no changes needed):
  - `minioClient` — configured `S3Client` from `@aws-sdk/client-s3` (MinIO via S3-compatible API; `forcePathStyle: true`).
  - `MINIO_BUCKET` — bucket name from env.
  - `MINIO_PUBLIC_URL` — public endpoint from `NEXT_PUBLIC_MINIO_ENDPOINT`.
- **Notes for later batches**:
  - This is the AWS S3 SDK v3 client, not the `minio` npm package. Use `PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, etc. from `@aws-sdk/client-s3`.
  - For presigned URLs use `@aws-sdk/s3-request-presigner` (`getSignedUrl`) — check package.json before importing; add if missing.
  - There are no `putObject` / `presignedGetObject` convenience helpers yet — later batches should either add thin wrappers in `lib/minio.ts` or call the AWS SDK commands directly from the invoice storage helper.
- **No changes made to `lib/minio.ts`** — `minioClient` is already exported under that exact name.

## Known trap: prisma migrate diff drops search index

`prisma migrate diff` and `prisma migrate dev` emit `DROP INDEX "invoices_search_vector_idx"`
because the `search_vector` column is declared `Unsupported("tsvector")?` and Prisma does not
know the GIN index belongs to it. Any future contributor running `migrate diff` must filter
this out of generated migrations. Do not apply a Prisma-generated migration without
verifying it does not contain this DROP. (Flagged during Batch A code review, 2026-04-15.)
