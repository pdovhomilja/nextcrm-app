# Changelog

All notable changes to NextCRM are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.1](https://github.com/pdovhomilja/nextcrm-app/compare/v0.10.0...v0.10.1) (2026-04-19)


### Bug Fixes

* **prisma:** add missing crm_Target_Contact migration ([7d76537](https://github.com/pdovhomilja/nextcrm-app/commit/7d76537f9ae994430fd782b6c7a789eb4dac69a8))
* **prisma:** add missing migration for crm_Target_Contact table ([792b8c3](https://github.com/pdovhomilja/nextcrm-app/commit/792b8c3ec24efeea963afdcbc71d4b2bf003bc72))

## [0.10.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.9.0...v0.10.0) (2026-04-18)


### Features

* **dashboard:** add Invoices, Campaigns, Targets cards; remove Employee card ([df13534](https://github.com/pdovhomilja/nextcrm-app/commit/df1353496e128f0f6c7035a28391e9ec8c786b76))
* **invoices:** add FKs, indexes, line-item trigger, money CHECK ([1496266](https://github.com/pdovhomilja/nextcrm-app/commit/1496266419db40292f2b0829eacafbc2c9457c4d))
* **invoices:** add numbering format template + counter consumer ([e533aeb](https://github.com/pdovhomilja/nextcrm-app/commit/e533aeb4e7bbe55c1b5a4a5e77c8a6872ef2bc6f))
* **invoices:** add PDF i18n string bundles (EN/CZ) ([02bcd7d](https://github.com/pdovhomilja/nextcrm-app/commit/02bcd7d04f3ffda004f8b2297038314ea0564dbd))
* **invoices:** add permission guards ([cb12109](https://github.com/pdovhomilja/nextcrm-app/commit/cb121093ed0f49895fa079a8158ed02ba74810ef))
* **invoices:** add Prisma schema, migration, tsvector trigger ([6b9f7f3](https://github.com/pdovhomilja/nextcrm-app/commit/6b9f7f366e8592a07d0ac534d0cc6b216762379c))
* **invoices:** add search filter builder ([a37c5fb](https://github.com/pdovhomilja/nextcrm-app/commit/a37c5fb894101a9f1d30ab91651f3ece0707d109))
* **invoices:** add totals computation with mixed VAT support ([cced002](https://github.com/pdovhomilja/nextcrm-app/commit/cced002054d70f3b6ccb26d6fca20d31bcf70584))
* **invoices:** admin pages — tax rates, series, currencies, settings ([9ed05dc](https://github.com/pdovhomilja/nextcrm-app/commit/9ed05dc5f6518784e72f697e5ef0595d04eea5b9))
* **invoices:** API routes for invoices CRUD, lifecycle, payments, search, admin config ([dcd47d0](https://github.com/pdovhomilja/nextcrm-app/commit/dcd47d09b367006c3fd467d817b7ef98969cc68c))
* **invoices:** fetch FX rates via frankfurter.app ([04c4e0e](https://github.com/pdovhomilja/nextcrm-app/commit/04c4e0e208aba5eb5ad849736357fbca4223f708))
* **invoices:** full invoicing module ([2b420ff](https://github.com/pdovhomilja/nextcrm-app/commit/2b420ff085211e321572a55e02a400662380fbc7))
* **invoices:** invoice email template ([788252b](https://github.com/pdovhomilja/nextcrm-app/commit/788252b5f3e31692f90a965f4132c1147619d8db))
* **invoices:** invoice UI — list, new, detail, edit pages ([40a09a6](https://github.com/pdovhomilja/nextcrm-app/commit/40a09a6e3e62da41d9b01bca8cbfab1bf687c4df))
* **invoices:** MinIO storage wrapper for invoice PDFs ([028d4c2](https://github.com/pdovhomilja/nextcrm-app/commit/028d4c2ed35b1cc0a945d317263cf76f82d18bc2))
* **invoices:** PDF render entry ([b9112c4](https://github.com/pdovhomilja/nextcrm-app/commit/b9112c426ad86b810d28a62a1faf723c4b7271ce))
* **invoices:** PDF template (@react-pdf/renderer) ([11109f6](https://github.com/pdovhomilja/nextcrm-app/commit/11109f62c5fdc5754446862b1beffb285a476127))
* **invoices:** seed currencies, default series, tax rates, settings ([68a8b80](https://github.com/pdovhomilja/nextcrm-app/commit/68a8b80793a5f989bd5ea031522e8e467d7459c0))
* **invoices:** server actions for invoice lifecycle ([e698e71](https://github.com/pdovhomilja/nextcrm-app/commit/e698e716141f4dcd0d48e2bea7a0bb9ec7217e7e))
* **invoices:** sidebar nav entry + i18n (EN/CZ) ([8c5f1d6](https://github.com/pdovhomilja/nextcrm-app/commit/8c5f1d609961e870b5823990695f75edbcd6a839))
* **invoices:** Zod schemas + shared types ([103b2c8](https://github.com/pdovhomilja/nextcrm-app/commit/103b2c81517ae23eed2e01f7361c0b1d8acc7273))


### Bug Fixes

* **invoices:** add PROFORMA to Zod invoice type enum ([18d6e40](https://github.com/pdovhomilja/nextcrm-app/commit/18d6e40281ab8fb726f21c6c4b99ddb92ea79ff6))
* **invoices:** fix Set type annotation in permissions for strict tsc ([1132616](https://github.com/pdovhomilja/nextcrm-app/commit/1132616272afd08368884862a2ef436bf24dfb12))
* **invoices:** hydration mismatches, decimal serialization, server action refactor ([75368f4](https://github.com/pdovhomilja/nextcrm-app/commit/75368f409bf61792ca0997492448b30ab4a3cd36))
* **invoices:** redirect to /invoices after creating new invoice ([2dd2d5e](https://github.com/pdovhomilja/nextcrm-app/commit/2dd2d5ecbee40f515a1f5d77153acffcea519600))
* **invoices:** redirect to invoice detail page after create/edit ([d58c35d](https://github.com/pdovhomilja/nextcrm-app/commit/d58c35db10e4ab03d88aec9fa0be7297d915db58))
* **invoices:** remove unused imports and prefix unused params ([b3e4ccc](https://github.com/pdovhomilja/nextcrm-app/commit/b3e4cccdabf580dedd4329afd3d2133eba38a436))
* **invoices:** remove unused React import from PDF template ([b851ece](https://github.com/pdovhomilja/nextcrm-app/commit/b851ece3b534acfbc4d628ad6fb10227679ee7c1))
* **invoices:** replace Account select with searchable combobox ([08e9b3d](https://github.com/pdovhomilja/nextcrm-app/commit/08e9b3d61f87113e6254fae2f48da15f6c2b42b5))
* **invoices:** review fixes — balanceDue, FX outside tx, permissions, search column, email template ([dde9dfa](https://github.com/pdovhomilja/nextcrm-app/commit/dde9dfaba15274c910329a71ad299585407c47f8))

## [0.9.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.8.0...v0.9.0) (2026-04-12)


### Features

* **crm:** add assign/disconnect document server actions for CRM tasks ([26f234a](https://github.com/pdovhomilja/nextcrm-app/commit/26f234a4837014b6ce8d8d3ae2f128367a7ec6c2))


### Bug Fixes

* **crm:** expand getCrMTask document select and clean up junction on delete ([b6d2f6b](https://github.com/pdovhomilja/nextcrm-app/commit/b6d2f6b4197999af116ae2165d80c7feb4cefd42))
* **crm:** remove task-specific filters from document table toolbar ([5cca3d1](https://github.com/pdovhomilja/nextcrm-app/commit/5cca3d1e4e25caef5b6b09056575495ec77c9a64))
* **crm:** switch CRM task document actions from broken axios calls to server actions ([efae73e](https://github.com/pdovhomilja/nextcrm-app/commit/efae73e56c78d80fcfa7b1358a3bf78df32e8f43))
* **crm:** uncomment assigned_to_user in task document schema and remove ts-ignore ([46c2868](https://github.com/pdovhomilja/nextcrm-app/commit/46c2868b34779d0924f578ae94dc3eb9cd303d7b))
* **crm:** wire CRM task documents to correct junction table + cleanup ([d4c503c](https://github.com/pdovhomilja/nextcrm-app/commit/d4c503c598a6905b6be826d311beb3fac2218bfa))
* **crm:** wire task comments to correct FK column (assigned_crm_account_task) ([c60ea57](https://github.com/pdovhomilja/nextcrm-app/commit/c60ea57dd2f45d800ead11466a32a5696d1c3754))
* **deps:** patch 2 Dependabot vulnerabilities ([0e2746c](https://github.com/pdovhomilja/nextcrm-app/commit/0e2746c2dd504e7e6a8c0d5e86ef9186e5b3c8f7))

## [0.8.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.7.1...v0.8.0) (2026-04-10)


### Features

* add Docker entrypoint script for auto-initialization ([1acba0a](https://github.com/pdovhomilja/nextcrm-app/commit/1acba0a5311dc99181075e61da92d59b099aff1c))
* add docker-compose.yml with all services ([c045ebb](https://github.com/pdovhomilja/nextcrm-app/commit/c045ebbfb0d07c25fa3e5c09c44b4ace7467b067))
* add multi-stage Dockerfile for NextCRM ([70a1b45](https://github.com/pdovhomilja/nextcrm-app/commit/70a1b45937af818df1a6b1c99f7d774f49af2796))
* Docker self-hosting setup with full automation ([bff363e](https://github.com/pdovhomilja/nextcrm-app/commit/bff363e646f0bfa55178922f4af05234515a0920))
* enable Next.js standalone output for Docker ([d8d1056](https://github.com/pdovhomilja/nextcrm-app/commit/d8d10565fb0fbb425f5d9bb2a41c3fe06a24cf83))


### Bug Fixes

* Docker e2e verification fixes ([e1ae699](https://github.com/pdovhomilja/nextcrm-app/commit/e1ae699cf8ce0e767bacdd3034f14bf3b4bf304b))
* **docker:** make admin email configurable via ADMIN_EMAIL ([7427b0a](https://github.com/pdovhomilja/nextcrm-app/commit/7427b0a3277b8fff83635cd1cf339eab92d442f1))
* **docker:** replace hardcoded credentials with env-driven placeholders ([255b11e](https://github.com/pdovhomilja/nextcrm-app/commit/255b11e882d4e6bdcb4172f8905bd65556ee22df))

## [0.7.1](https://github.com/pdovhomilja/nextcrm-app/compare/v0.7.0...v0.7.1) (2026-04-08)


### Bug Fixes

* merge dependabot vulnerability patches to main ([db6975a](https://github.com/pdovhomilja/nextcrm-app/commit/db6975a43a23fded9abb53bbdf6e9c45aa6c165d))
* patch 9 open dependabot vulnerabilities ([4c659fa](https://github.com/pdovhomilja/nextcrm-app/commit/4c659fa89d180933ef6ddc4df161e12e025d35a4))

## [0.7.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.6.1...v0.7.0) (2026-04-08)


### Features

* add SKILL.md download to Developer tab ([b1f528d](https://github.com/pdovhomilja/nextcrm-app/commit/b1f528d03b26ca4332f4d673c60cf51a8f303cab))
* add SKILL.md for Claude Code MCP integration ([b3a57b8](https://github.com/pdovhomilja/nextcrm-app/commit/b3a57b870403285efb883fafd1a4306db19fc5c2))

## [0.6.1](https://github.com/pdovhomilja/nextcrm-app/compare/v0.6.0...v0.6.1) (2026-04-07)


### Bug Fixes

* allow null description in opportunities table schema ([662e6bd](https://github.com/pdovhomilja/nextcrm-app/commit/662e6bd7992537a3f7c31e708f1b89d1d4399e96))
* allow null description in opportunities table schema ([8b414ac](https://github.com/pdovhomilja/nextcrm-app/commit/8b414acbe81bc327ffa7ff6a23fbc21436b817b0))

## [0.6.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.5.1...v0.6.0) (2026-04-07)


### Features

* align activity actions with deletedAt soft delete ([95de688](https://github.com/pdovhomilja/nextcrm-app/commit/95de688b97f712271e4ae771423aaadea627d104))
* align board/project actions with deletedAt soft delete ([df3fe1e](https://github.com/pdovhomilja/nextcrm-app/commit/df3fe1eb1a222cec130c1abd92918cfdbcc76c09))
* align campaign template actions with deletedAt soft delete ([a95ac24](https://github.com/pdovhomilja/nextcrm-app/commit/a95ac246e784cb3748a676126beefbd6b7e20d37))
* align crm-data and target-list actions with deletedAt soft delete ([eaa6a15](https://github.com/pdovhomilja/nextcrm-app/commit/eaa6a15ab8d76867100bb28bc84892180e583434))
* align target actions with deletedAt soft delete ([bbdad13](https://github.com/pdovhomilja/nextcrm-app/commit/bbdad13defcf45a9756cf055ea977cf156d66fab))
* MCP full parity (104 tools) + universal deletedAt soft-delete ([a164dcb](https://github.com/pdovhomilja/nextcrm-app/commit/a164dcb458a99a423a30357111c2068136973dc1))
* **mcp:** accounts delete uses deletedAt instead of status ([f565523](https://github.com/pdovhomilja/nextcrm-app/commit/f5655230775e703c0390811c0f9e7a4b77c2af25))
* **mcp:** add activities tools (5 tools, with entity links) ([7298d63](https://github.com/pdovhomilja/nextcrm-app/commit/7298d632b1ed1f87e32a911b216bbbae60f93425))
* **mcp:** add barrel export and update route handler with new error codes ([bec7bbd](https://github.com/pdovhomilja/nextcrm-app/commit/bec7bbd4a3eb832795c0485df508a1c88085cb4b))
* **mcp:** add campaigns tools (19 tools, full lifecycle + templates + steps + stats) ([7155053](https://github.com/pdovhomilja/nextcrm-app/commit/7155053f44598eb5db45b5f4460a370578ee2bf7))
* **mcp:** add contracts tools (5 tools, with line items) ([79c3013](https://github.com/pdovhomilja/nextcrm-app/commit/79c301311e0c1873941bb40d4af231aeec56e19a))
* **mcp:** add documents tools (8 tools, presigned URLs, entity linking) ([756d2be](https://github.com/pdovhomilja/nextcrm-app/commit/756d2bea8630cbd1196df6e14884139fe22fa465))
* **mcp:** add enrichment tools (4 tools, single + bulk for contacts and targets) ([2067f21](https://github.com/pdovhomilja/nextcrm-app/commit/2067f21ba57c61594cffa0ace229e3843a8bf9c4))
* **mcp:** add products tools (5 tools, org-wide catalog) ([7038bf2](https://github.com/pdovhomilja/nextcrm-app/commit/7038bf2dac23b7a12ad23cc0213f2aeb49ba56f1))
* **mcp:** add projects tools (18 tools, boards/sections/tasks/comments/watchers) ([b40f3ae](https://github.com/pdovhomilja/nextcrm-app/commit/b40f3ae572c61ad62de8b8c2ce0477535f2c6849))
* **mcp:** add reports tools (2) and email accounts tool (1) ([efe9cc7](https://github.com/pdovhomilja/nextcrm-app/commit/efe9cc719ac15ed1f3d99f8496eee9e5bb39adf4))
* **mcp:** add shared helpers for pagination, search, soft-delete, errors ([a8a0eb0](https://github.com/pdovhomilja/nextcrm-app/commit/a8a0eb0dd40375242c167c4f1a7f398286cfd683))
* **mcp:** add target lists tools (7 tools, membership management) ([4cdd748](https://github.com/pdovhomilja/nextcrm-app/commit/4cdd748582733be4f63f7382a6717cfb70a0cf62))
* **mcp:** campaigns use deletedAt instead of status for soft-delete ([0fac95e](https://github.com/pdovhomilja/nextcrm-app/commit/0fac95e803ff1bcd07a22e0af68e1da4ad76b8bd))
* **mcp:** documents use deletedAt instead of status for soft-delete ([440c629](https://github.com/pdovhomilja/nextcrm-app/commit/440c629f31a4af548640fd18ba66fc36ea9b2eb3))
* **mcp:** enable board soft-delete, add deletedAt filters to board queries ([8973d34](https://github.com/pdovhomilja/nextcrm-app/commit/8973d343ef5bc2bd7828f36b90fcf65f8cd2fabe))
* **mcp:** enable opportunities soft-delete, add deletedAt filters ([3805ab2](https://github.com/pdovhomilja/nextcrm-app/commit/3805ab298afb1f0c14848af12c503025ce472ad5))
* **mcp:** enable soft-delete for contacts, leads, targets, activities ([75217e4](https://github.com/pdovhomilja/nextcrm-app/commit/75217e431146a4a6871f17445a67c178c0e01405))
* **mcp:** rename account tools with crm_ prefix, add soft-delete, use helpers ([288204b](https://github.com/pdovhomilja/nextcrm-app/commit/288204bf7e870a7cc2b560c3994f7823ad311eb2))
* **mcp:** rename contacts/leads/opportunities/targets with crm_ prefix, add delete stubs ([24bfdcd](https://github.com/pdovhomilja/nextcrm-app/commit/24bfdcd7bbebdb164a25305438f566557995bb9e))
* **mcp:** target lists use deletedAt instead of boolean status ([1e917ed](https://github.com/pdovhomilja/nextcrm-app/commit/1e917edf1ba029648bee72cd9aa9c81aba907450))
* **mcp:** update helpers to use deletedAt-based soft delete ([41433ce](https://github.com/pdovhomilja/nextcrm-app/commit/41433ce7d26ac6b2ae6a31b7865b3da9007539db))


### Bug Fixes

* **mcp:** add explicit ReportFilters type annotation to fix date type mismatch ([68414eb](https://github.com/pdovhomilja/nextcrm-app/commit/68414eb4001ce2e0c35ea1e690db58c99960f510))
* **mcp:** fix campaign status filter collision and document unlink auth ([fc6f8a9](https://github.com/pdovhomilja/nextcrm-app/commit/fc6f8a91a24098a21b1f1a9ad454fa7c14d6c0e4))
* **mcp:** fix remaining status:true in target lists, update soft-delete report ([3037daf](https://github.com/pdovhomilja/nextcrm-app/commit/3037daf3dbc6a06360096f5934efab835a7401cb))
* **mcp:** prefix unused entity param in notFound helper ([e76305f](https://github.com/pdovhomilja/nextcrm-app/commit/e76305f4ff439c27c76f1cfedff31ae1296ef405))
* **mcp:** remove isNotDeleted from opportunities (enum type mismatch), fix unused import in products ([3792d51](https://github.com/pdovhomilja/nextcrm-app/commit/3792d515a0c05f97ea6f2c37749adcdafda8c3bc))

## [0.5.1](https://github.com/pdovhomilja/nextcrm-app/compare/v0.5.0...v0.5.1) (2026-04-06)


### Bug Fixes

* close pg pool on seed completion ([8193219](https://github.com/pdovhomilja/nextcrm-app/commit/81932196b5988495e329313b01c2f2e8a50b3ca6))

## [0.5.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.4.2...v0.5.0) (2026-04-05)


### Features

* **line-items:** add line items section to Contract detail page with copy-from-opportunity ([e3235fe](https://github.com/pdovhomilja/nextcrm-app/commit/e3235fe0f8c4c1e468ed239668dcb1d60a46a1ac))
* **line-items:** add line items section to Opportunity detail page ([24436e1](https://github.com/pdovhomilja/nextcrm-app/commit/24436e17a3d043ac1cefed2269cb6bebcf008323))
* **line-items:** add Prisma schema for Opportunity and Contract line items ([f3b1f30](https://github.com/pdovhomilja/nextcrm-app/commit/f3b1f301e464760780dea6402192e71cbfb90de8))
* **line-items:** add server actions for Contract line items with copy-from-opportunity ([baa83d1](https://github.com/pdovhomilja/nextcrm-app/commit/baa83d1b2bcc8401dd895f54c98402727ad8568b))
* **line-items:** add server actions for Opportunity line items ([680fa93](https://github.com/pdovhomilja/nextcrm-app/commit/680fa93ef4d2631b7f71d035804f954966b629a9))
* **line-items:** add shared calculation helper ([825c733](https://github.com/pdovhomilja/nextcrm-app/commit/825c7339302d995094ef595722f5c4f0718e6383))
* **line-items:** add shared LineItemsTable, AddLineItemForm, and EditLineItemForm components ([e839227](https://github.com/pdovhomilja/nextcrm-app/commit/e839227a731660b4c1bd32d9c6206f6ac03c6543))
* Products module, Line Items, and E2E test coverage ([cdb4498](https://github.com/pdovhomilja/nextcrm-app/commit/cdb4498460b2081c8609370a79e19ae7e9d4f6fc))
* **products:** add create and update product form components ([98c4e60](https://github.com/pdovhomilja/nextcrm-app/commit/98c4e60128ce5c983e48056197d6c69615d4ad56))
* **products:** add CSV bulk import server action ([3ed188a](https://github.com/pdovhomilja/nextcrm-app/commit/3ed188aee12bc9d9b98b00b1c0481a0acb569888))
* **products:** add CSV import dialog with preview and template download ([c9b7388](https://github.com/pdovhomilja/nextcrm-app/commit/c9b7388e0319c425716489a28a4a71bb1638a6dc))
* **products:** add Prisma schema for Products, ProductCategories, AccountProducts ([2c51b70](https://github.com/pdovhomilja/nextcrm-app/commit/2c51b70350dcede4e3ef2ec4e64993477916f79c))
* **products:** add product categories to CRM data fetching ([eba0ea6](https://github.com/pdovhomilja/nextcrm-app/commit/eba0ea653b3872c1288b8c1c40f83f7198e18d74))
* **products:** add product detail page with basic view, accounts tab, and history ([53d0d1f](https://github.com/pdovhomilja/nextcrm-app/commit/53d0d1f3fb6be30b08b5487e8c5996e74893dbc6))
* **products:** add products list page and view component ([9b33aa7](https://github.com/pdovhomilja/nextcrm-app/commit/9b33aa7440a4f7acb3a5eaba6d47f38b66d0a0fd))
* **products:** add server actions for Account-Product assignments ([ea3bc87](https://github.com/pdovhomilja/nextcrm-app/commit/ea3bc8746f4fa3bd3225ed47818d345a8f8e4d4c))
* **products:** add server actions for Product CRUD and data fetching ([e84ea83](https://github.com/pdovhomilja/nextcrm-app/commit/e84ea835663c59cef8021b86f3fd3afb9b64655b))
* **products:** add sidebar nav, account detail products tab with assign form ([3c1ab8b](https://github.com/pdovhomilja/nextcrm-app/commit/3c1ab8b1ceec1616362676b1cf6de7968d5aeb22))
* **products:** add table components with columns, filters, and row actions ([7fe5c4c](https://github.com/pdovhomilja/nextcrm-app/commit/7fe5c4ce5e1dfbfe196a55d2245e473952162ee4))


### Bug Fixes

* add currency field to contracts table schema ([ed6a675](https://github.com/pdovhomilja/nextcrm-app/commit/ed6a675648110d30aaf57920d9439c0f4c3f88fb))
* add line items migration and resolve migration drift ([1b6f483](https://github.com/pdovhomilja/nextcrm-app/commit/1b6f48392cf3801551ed918fd7b379aefe6b4513))
* default accounts prop to empty array in UpdateContractForm ([3e21eac](https://github.com/pdovhomilja/nextcrm-app/commit/3e21eac5fba06aed2e718964995a0b06f7f3ef50))
* guard FormSelect against undefined data and pass safe defaults ([91f1a45](https://github.com/pdovhomilja/nextcrm-app/commit/91f1a457083794e2301dda4863376acbc37e7584))
* **line-items:** resolve build and type issues ([211ab7c](https://github.com/pdovhomilja/nextcrm-app/commit/211ab7cf3cc496d08cc522c123323d9159426ecf))
* make FormSelect fully controlled to show defaultValue correctly ([0c926fc](https://github.com/pdovhomilja/nextcrm-app/commit/0c926fc80a7851d780dd62611b3f63e3596d8d3f))
* **products:** resolve audit log type errors and build issues ([784c444](https://github.com/pdovhomilja/nextcrm-app/commit/784c444267f635594402f0528be6679e3e9d37d2))
* refactor UpdateContractForm to self-fetch accounts and currencies ([23e1dab](https://github.com/pdovhomilja/nextcrm-app/commit/23e1dabcc8185deb0f93c161d08aa6347a972636))
* remove conflicting defaultValue from controlled FormDatePicker input ([326f995](https://github.com/pdovhomilja/nextcrm-app/commit/326f995857da1294a86ebb45420c9affc0d579b5))
* replace getEnabledCurrencies with proper server action ([614162d](https://github.com/pdovhomilja/nextcrm-app/commit/614162d9a2a70941cf6d338e5ad6c85243d04caf))
* serialize Decimal fields in getAllCrmData for client components ([8451299](https://github.com/pdovhomilja/nextcrm-app/commit/845129965078a0260c7cdc2a82a5a326104e38f4))
* serialize opportunity Decimal fields before passing to client component ([bed1604](https://github.com/pdovhomilja/nextcrm-app/commit/bed16042018525b18b9e2c59ace7f74568e1e574))
* stabilize flaky e2e tests across CRM modules ([dbb88b6](https://github.com/pdovhomilja/nextcrm-app/commit/dbb88b69fbe5dd013d7ea61d0da0c72036fbe3b2))

## [0.4.2](https://github.com/pdovhomilja/nextcrm-app/compare/v0.4.1...v0.4.2) (2026-04-04)


### Bug Fixes

* **security:** override defu&lt;=6.1.4 to 6.1.5 for prototype pollution CVE-2026-35209 ([507a866](https://github.com/pdovhomilja/nextcrm-app/commit/507a866326a3920e04e38afefdc60bd4140f9de7))
* **security:** patch defu prototype pollution CVE-2026-35209 ([29d187d](https://github.com/pdovhomilja/nextcrm-app/commit/29d187d2ab56fc7ec78913563864c2f7093c9c1b))

## [0.4.1](https://github.com/pdovhomilja/nextcrm-app/compare/v0.4.0...v0.4.1) (2026-04-04)


### Bug Fixes

* **build:** resolve failed migration before deploy ([d063791](https://github.com/pdovhomilja/nextcrm-app/commit/d0637914f2f296e079afd3fd280be204540c8b60))
* **migration:** rename and make idempotent for failed deploy recovery ([3393859](https://github.com/pdovhomilja/nextcrm-app/commit/339385928a7005ff36fbc6a3df64eaf678fa600b))
* **migration:** seed currencies and clean data before VARCHAR cast ([6ca3dcc](https://github.com/pdovhomilja/nextcrm-app/commit/6ca3dccf08960b8cf6c2d1e83c8a8a2632acb75a))

## [0.4.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.3.1...v0.4.0) (2026-04-04)


### Features

* add currency conversion library with unit tests ([b2eb41c](https://github.com/pdovhomilja/nextcrm-app/commit/b2eb41cdea7381c3aa513b785ef22a4410b8de90))
* add CurrencyProvider context and header CurrencySwitcher ([4851c56](https://github.com/pdovhomilja/nextcrm-app/commit/4851c562ee47116890bd414448ee2ecfa55f0b7f))
* **admin:** add currencies management page with table, rates, and ECB toggle ([6011159](https://github.com/pdovhomilja/nextcrm-app/commit/60111591311e525f2d5857f73ce40cd9e7aca231))
* **contracts:** add currency and snapshot rate to create/update actions ([1a6a4c8](https://github.com/pdovhomilja/nextcrm-app/commit/1a6a4c8010f7561985e2b865c20bae5d77e81082))
* **contracts:** add currency dropdown to create/update forms ([f0e961d](https://github.com/pdovhomilja/nextcrm-app/commit/f0e961d184c98acb39b4edb2d598e2e78ea651d7))
* **contracts:** display contract value with dynamic currency formatting ([d2c7308](https://github.com/pdovhomilja/nextcrm-app/commit/d2c7308d76ae70d6f5838bf33474d2bfb1f59b38))
* convert opportunity detail budget to display currency ([aa82933](https://github.com/pdovhomilja/nextcrm-app/commit/aa82933d27d3b5a960232c679f98fe451947786a))
* convert opportunity table budget to display currency ([030ca11](https://github.com/pdovhomilja/nextcrm-app/commit/030ca11feb1427455d33d1143b8ab1bf7cbb1e36))
* convert reports dashboard KPIs to display currency ([a564588](https://github.com/pdovhomilja/nextcrm-app/commit/a5645887b2f4ec14ee4db19a62bde43c25a85295))
* **dashboard:** display expected revenue in selected display currency ([7a2fa8f](https://github.com/pdovhomilja/nextcrm-app/commit/7a2fa8fece3fc5a10b35eabc1ebcf5b4dce2a9ff))
* **inngest:** add daily ECB exchange rate sync function ([61e0819](https://github.com/pdovhomilja/nextcrm-app/commit/61e08199f0bf783f7ebbb5230e298b8feafb0c56))
* **migration:** add currency support migration ([86b7663](https://github.com/pdovhomilja/nextcrm-app/commit/86b76636742c8bc4860de078f3731ac0e36886f9))
* multi-currency support for Sales module ([19848b0](https://github.com/pdovhomilja/nextcrm-app/commit/19848b0b050cf7f76e1694cc1a608c1f7a558eb2))
* **opportunities:** add currency dropdown to create/update forms ([49cb1b7](https://github.com/pdovhomilja/nextcrm-app/commit/49cb1b78e2595ee86651fe5ab6c0471856034d50))
* **opportunities:** add snapshot rate lookup on create/update ([f0f8380](https://github.com/pdovhomilja/nextcrm-app/commit/f0f8380a2cc72cac4ede8304a737129ec4f93313))
* **opportunities:** display budget and revenue with currency formatting ([664c096](https://github.com/pdovhomilja/nextcrm-app/commit/664c09645f9f161499e1e3486afda7b6700eeced))
* **reports:** convert sales report values to display currency ([3784f7d](https://github.com/pdovhomilja/nextcrm-app/commit/3784f7df9df29567cfe4a443f2fc9fdfefadd1d2))
* **schema:** add Currency, ExchangeRate, SystemSettings models and migrate money fields to Decimal ([bf3f16d](https://github.com/pdovhomilja/nextcrm-app/commit/bf3f16d29532af16e8cd9dae46bb2d570fa6d0fd))
* **seed:** add currency and exchange rate seed data ([3da4975](https://github.com/pdovhomilja/nextcrm-app/commit/3da4975b75029a1b7134c875e8f6656849cd73df))


### Bug Fixes

* add currency to Opportunity schema type and fix implicit any ([a7ab752](https://github.com/pdovhomilja/nextcrm-app/commit/a7ab752aa9c5879ee13600e7565852e0d251f2c6))
* add explicit types to currency map callbacks ([7d4d5a4](https://github.com/pdovhomilja/nextcrm-app/commit/7d4d5a4912b285c7f84974fd08fadef3855c3aa1))
* add explicit types to currency map callbacks in layout ([33e74f4](https://github.com/pdovhomilja/nextcrm-app/commit/33e74f44d2bf16a28a880986803e1247034e294d))
* remove any casts from serializeDecimalsList call sites ([10a5fe9](https://github.com/pdovhomilja/nextcrm-app/commit/10a5fe9e8d0530d8993d080cf5b78555840b4709))
* resolve build errors - type casts and Inngest function signature ([0e3bf0f](https://github.com/pdovhomilja/nextcrm-app/commit/0e3bf0f0ae5abed134d9319d460985c4dae7c782))
* resolve type issues in ECB sync function ([79b2663](https://github.com/pdovhomilja/nextcrm-app/commit/79b266346fada836cb16c971224bc4a9ee502b9b))
* **schema:** add [@db](https://github.com/db).VarChar(3) to crm_Opportunities.currency field ([0ef0b8b](https://github.com/pdovhomilja/nextcrm-app/commit/0ef0b8ba54251aed2900f8dc03558c315025869e))
* serialize Decimal fields before passing to client components ([ff68db2](https://github.com/pdovhomilja/nextcrm-app/commit/ff68db28f40b01111cf56ccd4b6d822f3e69cf24))
* split currency lib into client-safe and server-only modules ([1a61be3](https://github.com/pdovhomilja/nextcrm-app/commit/1a61be3b404ce10b85e50769b76dba1a8037477c))
* **tests:** update sales report tests for currency-aware aggregation ([c02d752](https://github.com/pdovhomilja/nextcrm-app/commit/c02d7524a9636eb1ea2f2e81f27cb303833db81e))
* wire currencies prop through opportunity and contract components ([dba0036](https://github.com/pdovhomilja/nextcrm-app/commit/dba0036335819f598ec430f165cad8edf55b8213))

## [0.3.1](https://github.com/pdovhomilja/nextcrm-app/compare/v0.3.0...v0.3.1) (2026-04-04)


### Bug Fixes

* **auth:** resolve Google OAuth user creation failures ([844389a](https://github.com/pdovhomilja/nextcrm-app/commit/844389a689c0f20ab8d75bdf10648beeb829c5e3))
* **auth:** resolve Google OAuth user creation failures ([094e7ee](https://github.com/pdovhomilja/nextcrm-app/commit/094e7ee715c034b7c023a574241871690cee68ad))

## [0.3.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.2.0...v0.3.0) (2026-04-04)


### Features

* **documents:** add batch actions bar for bulk delete, type change, and account linking ([7ed7cfa](https://github.com/pdovhomilja/nextcrm-app/commit/7ed7cfa0ef97bd7281605a390a7b212fc3aa1324))
* **documents:** add bulk actions, versioning, and account linking server actions ([6a8908a](https://github.com/pdovhomilja/nextcrm-app/commit/6a8908a39580f20e99e232fc03f944d381b1265f))
* **documents:** add document detail panel with summary, metadata, and version history ([9fd00f1](https://github.com/pdovhomilja/nextcrm-app/commit/9fd00f1a0785e7715aaf4e4e6c70457e7256efee))
* **documents:** add enrichment fields, chunks table, and embeddings model ([c58a1e6](https://github.com/pdovhomilja/nextcrm-app/commit/c58a1e657b23795504cdc9708682ab6e5d69178c))
* **documents:** add Inngest enrichment orchestrator with text extraction, embedding, summary, classification ([a7216cb](https://github.com/pdovhomilja/nextcrm-app/commit/a7216cbb1a0a5370096560a5a513ec0e732b1743))
* **documents:** add name/content search toggle on documents page ([8043818](https://github.com/pdovhomilja/nextcrm-app/commit/8043818bc1c2756ceb4cf7d3dd19f0fabe8de461))
* **documents:** add processing status badge component ([514fa69](https://github.com/pdovhomilja/nextcrm-app/commit/514fa6963c9c4c7946bd4f08ac4d634110f68dc2))
* **documents:** add thumbnail generator and register Inngest functions ([b0b406e](https://github.com/pdovhomilja/nextcrm-app/commit/b0b406ea4be6e75d865b0f85f1f21ccb5a693365))
* **documents:** add upload-from-account-context with auto-linking ([cb3a096](https://github.com/pdovhomilja/nextcrm-app/commit/cb3a0963573e6ca5d38e4bb2d731b639dce09ee0))
* **documents:** redesign columns with type badges, summaries, status, and filters ([9ecd298](https://github.com/pdovhomilja/nextcrm-app/commit/9ecd2984127f91fdcbe50616a5ae21afcf8eb64d))
* **documents:** replace 3 upload buttons with single bulk upload modal ([dde3a47](https://github.com/pdovhomilja/nextcrm-app/commit/dde3a477e01ded54ba52953ed80da2baa8099e4e))
* **documents:** update createDocument with Inngest event, add checkDuplicate action ([90c2bbc](https://github.com/pdovhomilja/nextcrm-app/commit/90c2bbc3021ba54eb3133a89fe6df9c9c8ecdfef))
* **documents:** update Zod schema and static filter data for enrichment fields ([4ce71b3](https://github.com/pdovhomilja/nextcrm-app/commit/4ce71b37a63ab09999ba4d7283a8d1a4850fb6bc))
* **search:** add document search to command palette ([a0a5bbe](https://github.com/pdovhomilja/nextcrm-app/commit/a0a5bbe064b358933f33fa8ad1b43c039c64659d))
* **search:** add documents to unified search with keyword + vector similarity ([299736f](https://github.com/pdovhomilja/nextcrm-app/commit/299736fd74c539b65472db021cc8cfe0f1335abd))


### Bug Fixes

* **documents:** check upload response status in bulk upload modal ([d71dbf5](https://github.com/pdovhomilja/nextcrm-app/commit/d71dbf52edb03144ba89f3b20e2dc5b4ef9deca1))
* **documents:** exclude pdf-parse and pdfjs-dist from Turbopack server bundle ([6ea7e4b](https://github.com/pdovhomilja/nextcrm-app/commit/6ea7e4bec671046ea396e29930d132dcbe10d6f0))
* **documents:** replace next/image with img tag in DocumentViewModal ([3d2dafd](https://github.com/pdovhomilja/nextcrm-app/commit/3d2dafdae168a2dccc6826d0b897a99351d0c901))
* **documents:** use pdf-parse v2 class-based API for text extraction ([2825f90](https://github.com/pdovhomilja/nextcrm-app/commit/2825f90efc4f2cf97c65901f7c1f7d9f4125db25))
* **documents:** use row.original directly instead of Zod parse in row actions ([20a6016](https://github.com/pdovhomilja/nextcrm-app/commit/20a601665e0e7b24b6a9555eeb298460c4468505))
* update @vercel/mcp-adapter to v1.0.0 and add to trusted builds ([e1583c2](https://github.com/pdovhomilja/nextcrm-app/commit/e1583c2a7d87f6fc1790f0e0432d4812308988a7))

## [0.2.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.1.0...v0.2.0) (2026-04-03)


### Features

* **footer:** read app version from package.json ([0052e17](https://github.com/pdovhomilja/nextcrm-app/commit/0052e17aadf5283299da88bc695c4b4124fa48fd))
* **footer:** read app version from package.json instead of env var ([003a728](https://github.com/pdovhomilja/nextcrm-app/commit/003a728b56429230d40058622e7d0f6fb925e150))

## [0.1.0] - 2026-04-03

This release is a major milestone — it replaces the entire authentication system, adds a full reporting module, CRM activity tracking, audit logging, soft delete, configurable CRM settings, and AI-powered contact enrichment via E2B sandboxes.

### Added

#### Authentication (better-auth)
- Replaced next-auth with better-auth (Google OAuth + Email OTP login)
- Role-based access control (RBAC) — admin / member / viewer roles
- Server-side `getSession` helper and admin plugins
- Email OTP authentication flow with magic link support
- Admin UI for role management (replaces activate/deactivate toggles)
- Idempotent role backfill migration script
- better-auth session, account, and verification tables in database

#### Reports Module
- Full reporting dashboard with KPI cards (sales, leads, accounts, activity, campaigns, users)
- Sub-pages: Sales, Leads, Accounts, Activity, Campaigns, Users
- Date range picker and filter bar
- CSV export via API route
- PDF export with Inngest-scheduled email delivery
- Save report configurations and schedule recurring reports
- shadcn/ui chart components replacing Tremor

#### CRM Activities
- Activity tracking on all 5 CRM entity detail pages (accounts, contacts, leads, opportunities, contracts)
- `ActivityForm` sheet for creating/editing activities
- `ActivitiesView` paginated feed with compound cursor pagination
- `crm_Activities` and `crm_ActivityLinks` database models

#### CRM Audit Log & Soft Delete
- Soft delete on accounts, contacts, leads, opportunities, contracts
- `crm_AuditLog` model tracking all field changes with before/after diffs
- History tab on all CRM entity detail pages
- Admin audit log page with global filterable table and restore actions

#### CRM Settings (Admin)
- Admin page with 7-tab configuration UI for CRM field values
- Configurable: Contact Types, Lead Sources, Lead Statuses, Lead Types
- CRUD dialogs for each config category
- CRM Settings link in admin sidebar

#### AI Enrichment (E2B Agent)
- E2B sandbox agent enrichment for campaign targets
- Multi-field enrichment with preset selector
- Company-name-only enrichment path (no email required)
- Bulk enrichment modal with field selector
- `crm_Target_Contact` model for multi-contact per target
- 8 new enrichment fields: personal email, LinkedIn, Twitter, phone, title, department, location, bio
- Skip-list cache (5-min TTL) to avoid re-enriching recently processed targets

#### Target Enrichment & Conversion
- Convert Target → Account/Contact flow
- Conversion tracking fields in `crm_Targets`
- Gmail quick-connect with App Password guide and folder discovery
- `TargetContactsTable` with add-contact and enrich actions

#### Contracts
- Contracts detail page with BasicView
- Contracts listed in admin audit log

### Fixed

- Auth: Critical authorization bypass patched
- Auth: Operator precedence bugs in session checks
- Auth: Redirect to sign-in after sign-out
- Auth: better-auth schema compatibility and modelName mapping for Users table
- Reports: Chart colors using `hsl()` wrapper and purple palette
- Reports: Prisma field names aligned across all report actions
- Reports: `created_on` vs `createdAt` field name in campaigns action
- CRM: `assigned_to_user` null guard in account BasicView
- CRM: UUID constraints in update forms (`z.uuid()` replacing `max(30)`)
- CRM: Operator precedence in leads name column cell
- CRM: Soft-delete columns migration made idempotent
- Campaigns: Targets import validation relaxed (last_name or company required)
- Enrichment: Company domain discovery before agent runs
- Enrichment: Personal email vs company domain routing
- Enrichment: Null upsert key guard and DB updates wrapped in `step.run`
- Inngest: `gen_random_uuid()` added to embedding INSERT statements
- Inngest: v4 API compatibility fixes
- Build: All TypeScript errors resolved (operator precedence, missing imports, type safety)

### Changed

- Login page rewritten — credentials/register flow removed, Google OAuth + Email OTP only
- All server actions migrated from next-auth to better-auth session
- All API routes migrated to better-auth session
- Admin `isAdmin`/`is_admin` checks replaced with role-based RBAC
- CRM lead/contact forms now use DB-backed FK select values
- Reports page replaced static view with live KPI dashboard
- Tremor chart library removed — replaced with shadcn/ui charts

### Security

- Critical authorization bypass fixed in auth middleware
- Password removed from invite email template
- Session token strategy updated to better-auth cookie-based auth

### Removed

- next-auth package and all type definitions
- Register page and password reset flow
- Credentials-based login
- Tremor (`@tremor/react`) dependency

---

## [0.0.3-beta] - 2024

- Initial beta releases with MongoDB → PostgreSQL migration
- Basic CRM modules: Accounts, Contacts, Leads, Opportunities
- Campaign management with target lists
- AI document processing (OCR, PDF, DOCX)
- Vector embeddings with pgvector

[0.1.0]: https://github.com/pdovhomilja/nextcrm-app/compare/v0.0.3-beta...v0.1.0
[0.0.3-beta]: https://github.com/pdovhomilja/nextcrm-app/releases/tag/v0.0.3-beta
