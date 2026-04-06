# Changelog

All notable changes to NextCRM are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0](https://github.com/pdovhomilja/nextcrm-app/compare/v0.5.1...v0.6.0) (2026-04-06)


### Features

* account update sheet on list + detail pages, fix UUID id constraint ([8c62b6e](https://github.com/pdovhomilja/nextcrm-app/commit/8c62b6e5fc7b516bea577d3fc6e470fb6ba7d455))
* account update sheet on list + detail pages, fix UUID id constraint ([ea58212](https://github.com/pdovhomilja/nextcrm-app/commit/ea582120f8891bdd0adef34baca2f1adc1fdd5be))
* add 4-step campaign creation wizard ([821f3bb](https://github.com/pdovhomilja/nextcrm-app/commit/821f3bbb098a0f10e8ba989a7f59ff9b48e7e9ee))
* add 8 new fields to target actions, import, and column mapping ([3f6c118](https://github.com/pdovhomilja/nextcrm-app/commit/3f6c1188e186f0501cb89a6738c98a9b8d6b3268))
* add 90s timeout to AgentEnrichmentStrategy orchestrator call ([397772f](https://github.com/pdovhomilja/nextcrm-app/commit/397772fe57fdc1ccd6585329c1c19991867bc797))
* add ActivitiesView paginated feed component ([2621311](https://github.com/pdovhomilja/nextcrm-app/commit/2621311857b4fd75f199f5c30231ed1f6f906519))
* add ActivityEntry component (with ActivityForm stub) ([0f3f533](https://github.com/pdovhomilja/nextcrm-app/commit/0f3f53339ae9c81aa3c1bd5edf85cda88f74dbb1))
* add admin audit log page with global filterable table ([16042a0](https://github.com/pdovhomilja/nextcrm-app/commit/16042a0669b1029b9ddde04a748a4e96c5ca5693))
* add admin sidebar layout and LLM Keys management page ([7fc26bf](https://github.com/pdovhomilja/nextcrm-app/commit/7fc26bfc8b94fb217feb70d65adf086a439e95ea))
* add admin system API key server actions ([95f69b9](https://github.com/pdovhomilja/nextcrm-app/commit/95f69b9f3986d8cc32458f0f6332375cd2821a25))
* add ApiKeys model — replace openAi_keys with encrypted multi-provider key store ([463c9f7](https://github.com/pdovhomilja/nextcrm-app/commit/463c9f7b398e376ec80b19ba70090c44e40e8d56))
* add audit log fetch actions (by entity + admin global) ([15d0d70](https://github.com/pdovhomilja/nextcrm-app/commit/15d0d7097775a72705fe024a2c89d7d86f26f4d0))
* add AuditEntry and AuditTimeline UI components ([e5d5942](https://github.com/pdovhomilja/nextcrm-app/commit/e5d594247a6511a4ee3c09dc316f319898006ecd))
* add bulk contact selection and BulkEnrichModal ([48fdc4b](https://github.com/pdovhomilja/nextcrm-app/commit/48fdc4b89dcd3053d0a9eb8246f4422d01662124))
* add bulk enrichment fan-out and register Inngest functions ([7da981b](https://github.com/pdovhomilja/nextcrm-app/commit/7da981b4d140e548385ea480179545c30bcd7755))
* add bulk target selection and BulkEnrichTargetsModal ([f49c1a3](https://github.com/pdovhomilja/nextcrm-app/commit/f49c1a3ac29c128cb68b9799ddfb7e94243ca942))
* add campaign detail page with analytics, steps timeline, and recipients table ([9360e5a](https://github.com/pdovhomilja/nextcrm-app/commit/9360e5a53c44feec9f92f6b24ab89d5f9e39f7c4))
* add campaign Inngest jobs (schedule-send, send-step, follow-up, send-now) ([14e1cec](https://github.com/pdovhomilja/nextcrm-app/commit/14e1cecce3ddb222662db2a61eada2b26ba1e631))
* add campaign server actions (CRUD, schedule, send-now, pause) ([e40e0f4](https://github.com/pdovhomilja/nextcrm-app/commit/e40e0f4605e56ed82a31a64202d08fb85db14324))
* add campaign templates server actions and list page ([1f380d6](https://github.com/pdovhomilja/nextcrm-app/commit/1f380d63312e7298753394c9e3ae2f97c0218195))
* add campaign unsubscribe API route ([b19fd46](https://github.com/pdovhomilja/nextcrm-app/commit/b19fd462641be569ac3432be50189cdaccc04c56))
* add campaigns list page with search and status filter ([87d4e76](https://github.com/pdovhomilja/nextcrm-app/commit/87d4e76a4d760d0f8417250e8be0783d72a8e3b2))
* add campaigns module prisma schema ([1d34fe8](https://github.com/pdovhomilja/nextcrm-app/commit/1d34fe811ea870d75371eac82908bd4336a291a4))
* add Campaigns module with templates, scheduling, and analytics ([22d7ed7](https://github.com/pdovhomilja/nextcrm-app/commit/22d7ed71a7402ed85861370510f0e27967ac6021))
* add Campaigns sidebar navigation, remove targets from CRM nav ([87443b5](https://github.com/pdovhomilja/nextcrm-app/commit/87443b53be81fccd3eb27766fb2cfa403b91f276))
* add contact create and enrich API routes ([c63e453](https://github.com/pdovhomilja/nextcrm-app/commit/c63e45364bef8545281986795875ef5bffd9a16c))
* add ContactDetailActions — update sheet on contact detail page ([962443f](https://github.com/pdovhomilja/nextcrm-app/commit/962443f15e49c929b474a45fb15bc6f22c5be2eb))
* add convert-target action and Convert to Account button ([50aabb1](https://github.com/pdovhomilja/nextcrm-app/commit/50aabb1a5181d2d5680ab5fdc7da8b0a0fc9b908))
* add create/update/delete activity server actions ([3a760fe](https://github.com/pdovhomilja/nextcrm-app/commit/3a760fe58edc0a171ecb53d392dfb7ac7e17f14c))
* add CRM Settings to admin sidebar navigation ([c39adc4](https://github.com/pdovhomilja/nextcrm-app/commit/c39adc4c099aa98226bdb3a274d2a6fb1b65184c))
* add crm_Activities and crm_ActivityLinks schema ([645465c](https://github.com/pdovhomilja/nextcrm-app/commit/645465c824ccd20af8249e56e9d5e8805b0f875d))
* add crm_AuditLog model and soft delete columns ([5345f67](https://github.com/pdovhomilja/nextcrm-app/commit/5345f67c36a71157851758398d9ca7fcfe9e150a))
* add crm_Contact_Enrichment model and migration ([712f70c](https://github.com/pdovhomilja/nextcrm-app/commit/712f70c81dbd8922f33cee286ab2e0e8139ec33a))
* add crm_Contact_Types, crm_Lead_Sources, crm_Lead_Statuses, crm_Lead_Types models ([ae944be](https://github.com/pdovhomilja/nextcrm-app/commit/ae944be11028c104aa34d27551723429996d1fbe))
* add crm_Target_Contact model for multi-contact enrichment ([e9f42be](https://github.com/pdovhomilja/nextcrm-app/commit/e9f42be6dfffcd4ede2d51570fe39a7c330f76d0))
* add crm_Target_Enrichment model to schema ([fa8d5f8](https://github.com/pdovhomilja/nextcrm-app/commit/fa8d5f838b3906c89cb4328bca682c2d89a81f03))
* add currency conversion library with unit tests ([b2eb41c](https://github.com/pdovhomilja/nextcrm-app/commit/b2eb41cdea7381c3aa513b785ef22a4410b8de90))
* add CurrencyProvider context and header CurrencySwitcher ([4851c56](https://github.com/pdovhomilja/nextcrm-app/commit/4851c562ee47116890bd414448ee2ecfa55f0b7f))
* add deletedAt: null filter to all CRM entity get/list queries ([8f906b4](https://github.com/pdovhomilja/nextcrm-app/commit/8f906b4370b31af57ebc87c6e885ec327999281e))
* add E2B agent script and apply-result helpers ([80ee1c3](https://github.com/pdovhomilja/nextcrm-app/commit/80ee1c3c48311bd4110c3829694093cbdfc379fd))
* add E2B sandbox template for agent enrichment ([910f61d](https://github.com/pdovhomilja/nextcrm-app/commit/910f61d7c7c78bd2ead01e8a7fdc4fb997a3b092))
* add Enrich with AI button to contact detail page ([61ab3f6](https://github.com/pdovhomilja/nextcrm-app/commit/61ab3f650578cf143158457fe39a771e1d911d43))
* add Enrich with AI button to target detail page ([71c2cc9](https://github.com/pdovhomilja/nextcrm-app/commit/71c2cc9c2d74e2c4464cb8f0e588b4a9cbd1126c))
* add enrich-contact Inngest function with dedup logic ([3e7c2d6](https://github.com/pdovhomilja/nextcrm-app/commit/3e7c2d6c9e8ef1b544eb58f0e16cff08b2b22b4c))
* add enrich-target-contact Inngest function ([1422ef8](https://github.com/pdovhomilja/nextcrm-app/commit/1422ef868f90e38d261feca684eefb450d85b038))
* add EnrichContactDrawer with SSE progress and diff preview ([2564650](https://github.com/pdovhomilja/nextcrm-app/commit/25646503bdc908689a03a7f7e2cb6d162526d4dd))
* add EnrichFieldSelector shared component ([6011818](https://github.com/pdovhomilja/nextcrm-app/commit/60118182b0fa05064515b4b5dbf3926492a56d2c))
* add enrichment + conversion fields to crm_Targets (schema + migration) ([8e92c3d](https://github.com/pdovhomilja/nextcrm-app/commit/8e92c3d8ec841a49d25fd3217920b95903fe8c78))
* add enrichment jobs status page ([398a6c6](https://github.com/pdovhomilja/nextcrm-app/commit/398a6c6ef7b8e452a2dd69e4aece72fda0813c3f))
* add EnrichTargetDrawer and EnrichButton, extend EnrichFieldSelector with optional props ([4706e19](https://github.com/pdovhomilja/nextcrm-app/commit/4706e191ebe50a851cc6f0183ed7e04a0156c9b0))
* add filter bar and restore wiring to admin audit log page ([13c636c](https://github.com/pdovhomilja/nextcrm-app/commit/13c636cd609f0371f098f72b52bc2be5a6bdae27))
* add getActivitiesByEntity fetch action with compound cursor pagination ([419e945](https://github.com/pdovhomilja/nextcrm-app/commit/419e9451bd7a64e824857f93f36c080073c07519))
* add getApiKey resolver — 3-tier ENV/system/user priority chain ([8f0e15b](https://github.com/pdovhomilja/nextcrm-app/commit/8f0e15b6d39333d6072946569f70e00746f2210c))
* add History tab to all CRM entity detail pages ([3162f45](https://github.com/pdovhomilja/nextcrm-app/commit/3162f4554f8c90a175de7911b0950297106cbf9d))
* add LeadDetailActions — update sheet on lead detail page ([b6bb388](https://github.com/pdovhomilja/nextcrm-app/commit/b6bb38883f6be225f08cd792a2275cfa49bd7ea6))
* add LLMs tab to profile settings ([72ef115](https://github.com/pdovhomilja/nextcrm-app/commit/72ef11511f4cea50c98f0c6bc3078e3a2602af2d))
* add merge tags utility for campaign email rendering ([bf75a73](https://github.com/pdovhomilja/nextcrm-app/commit/bf75a731af084d80b3848cbd757bbdb7c7be1a52))
* add new target fields to forms and enrichment preset selector ([c3db425](https://github.com/pdovhomilja/nextcrm-app/commit/c3db4252d8a25abeed9a70916e00aef228c107fa))
* add NoApiKeyDialog and wire into enrichment components ([5f58c67](https://github.com/pdovhomilja/nextcrm-app/commit/5f58c6756ffbe947f32fedc1fd332e9a7acee9d0))
* add OpportunityDetailActions — update sheet on opportunity detail page ([13625ba](https://github.com/pdovhomilja/nextcrm-app/commit/13625ba023a559355f55995cd561819907aec278))
* add PATCH contact route for applying enrichment fields ([a96df58](https://github.com/pdovhomilja/nextcrm-app/commit/a96df586c251c18358a57b4b2a3b643449dd0e40))
* add Resend webhook handler for campaign delivery tracking ([ac36db0](https://github.com/pdovhomilja/nextcrm-app/commit/ac36db0e50d020570203789af122799f255ddd9e))
* add shared target enrichment field presets and FIELD_MAP module ([26ab8b4](https://github.com/pdovhomilja/nextcrm-app/commit/26ab8b438fd7bbddd69a5ee9e3238cfb19e6b714))
* add SSE contact enrichment API route with validation tests ([9d0b4c4](https://github.com/pdovhomilja/nextcrm-app/commit/9d0b4c4e5d808084cdc41673ee733c3cb40e8464))
* add target enrichment fields and conversion tracking to schema ([670fc7b](https://github.com/pdovhomilja/nextcrm-app/commit/670fc7b7af8c3ce6952cece190de4e6c4ff795d9))
* add target enrichment Inngest jobs, bulk route, and registration ([3acd326](https://github.com/pdovhomilja/nextcrm-app/commit/3acd326c086b65cccea86949520da6cbec079999))
* add target enrichment jobs status page ([105fc50](https://github.com/pdovhomilja/nextcrm-app/commit/105fc50192aba1af6094e62da3de941bc9e21125))
* add target SSE enrichment route, PATCH route, and validation tests ([15eece7](https://github.com/pdovhomilja/nextcrm-app/commit/15eece78d10d0b9e122e695a31c10e1ff1f7d434))
* add TargetContactsTable with add-contact and enrich actions ([e7a7627](https://github.com/pdovhomilja/nextcrm-app/commit/e7a7627284611998bce59d59b5c457d13820d3b3))
* add TipTap editor component, AI template generation, and template editor pages ([c682f13](https://github.com/pdovhomilja/nextcrm-app/commit/c682f13b3c366fc54cee78c4e3019a528c781be2))
* add user profile API key server actions ([fa706ba](https://github.com/pdovhomilja/nextcrm-app/commit/fa706ba231f07bbe719408c84bf57f343762af69))
* add writeAuditLog utility and diffObjects with unit tests ([de01018](https://github.com/pdovhomilja/nextcrm-app/commit/de010189c843a3b195ca9b6bc2a319c07f57d466))
* **admin:** add currencies management page with table, rates, and ECB toggle ([6011159](https://github.com/pdovhomilja/nextcrm-app/commit/60111591311e525f2d5857f73ce40cd9e7aca231))
* AI contact & target enrichment with flexible API key management ([10d8b45](https://github.com/pdovhomilja/nextcrm-app/commit/10d8b459cb960a9b5e67336a65c262382ab707e4))
* **auth:** add better-auth client with email OTP and admin plugins ([d605f28](https://github.com/pdovhomilja/nextcrm-app/commit/d605f287e49f5b57995acef9055e4bb85b67eb54))
* **auth:** add RBAC permission definitions for admin/member/viewer ([a2ace92](https://github.com/pdovhomilja/nextcrm-app/commit/a2ace92e9e35afa450960ed187f37a1e38f49e91))
* **auth:** add server-side getSession helper ([57562a4](https://github.com/pdovhomilja/nextcrm-app/commit/57562a4e73768c8de7ad74b4ccba4371ada09ce5))
* **auth:** replace next-auth with better-auth ([eccad80](https://github.com/pdovhomilja/nextcrm-app/commit/eccad80d733c50ca62cdaf4cf7493470225ba346))
* **auth:** replace NextAuth route handler with better-auth catch-all ([f4433a5](https://github.com/pdovhomilja/nextcrm-app/commit/f4433a5437bf7d2fe71bdbd6bf1ac6a0b78ab446))
* **auth:** rewrite auth config with better-auth, Google OAuth, email OTP, RBAC ([94e6f3a](https://github.com/pdovhomilja/nextcrm-app/commit/94e6f3a68cfc2d4cdc209e7c46651f6bb6725343))
* **auth:** rewrite login page with Google OAuth + Email OTP ([1eb6635](https://github.com/pdovhomilja/nextcrm-app/commit/1eb663503e1264c6a755ca637d14f5a513b5c8b0))
* **auth:** update admin UI and replace all isAdmin/is_admin with role-based checks ([5956a66](https://github.com/pdovhomilja/nextcrm-app/commit/5956a6618ab125aeae3039c147c9599919bb8c3a))
* **auth:** update proxy.ts from next-auth JWT to better-auth cookie check ([99e0c4c](https://github.com/pdovhomilja/nextcrm-app/commit/99e0c4c2a69c542f9e36f7de0c73d0be01fc6403))
* build proper contracts detail page with BasicView ([c861329](https://github.com/pdovhomilja/nextcrm-app/commit/c861329e36d61245b8f8797f592dfb3f1cb6e78a))
* **contracts:** add currency and snapshot rate to create/update actions ([1a6a4c8](https://github.com/pdovhomilja/nextcrm-app/commit/1a6a4c8010f7561985e2b865c20bae5d77e81082))
* **contracts:** add currency dropdown to create/update forms ([f0e961d](https://github.com/pdovhomilja/nextcrm-app/commit/f0e961d184c98acb39b4edb2d598e2e78ea651d7))
* **contracts:** display contract value with dynamic currency formatting ([d2c7308](https://github.com/pdovhomilja/nextcrm-app/commit/d2c7308d76ae70d6f5838bf33474d2bfb1f59b38))
* convert opportunity detail budget to display currency ([aa82933](https://github.com/pdovhomilja/nextcrm-app/commit/aa82933d27d3b5a960232c679f98fe451947786a))
* convert opportunity table budget to display currency ([030ca11](https://github.com/pdovhomilja/nextcrm-app/commit/030ca11feb1427455d33d1143b8ab1bf7cbb1e36))
* convert reports dashboard KPIs to display currency ([a564588](https://github.com/pdovhomilja/nextcrm-app/commit/a5645887b2f4ec14ee4db19a62bde43c25a85295))
* copy fire-enrich lib into lib/enrichment/ ([69956e7](https://github.com/pdovhomilja/nextcrm-app/commit/69956e765207d8b9c523fee72ecb1a87fcc9ac4f))
* CRM Activities — Communication History (Sub-project B) ([3d9ca4e](https://github.com/pdovhomilja/nextcrm-app/commit/3d9ca4eee89020c52da3023be5944fea1a23ba46))
* CRM settings admin page with 7-tab config UI ([cb166d7](https://github.com/pdovhomilja/nextcrm-app/commit/cb166d7797d2a668f6948ad2bd0ef46f2a33baeb))
* CRM settings admin UI components — ConfigList, Add/Edit/Delete dialogs ([d1c34ec](https://github.com/pdovhomilja/nextcrm-app/commit/d1c34ec6fa11a63e9e38ba16c4d24228c59da324))
* CRM settings server actions with unit tests ([e6429ee](https://github.com/pdovhomilja/nextcrm-app/commit/e6429ee877283ac028c6b19c5315571fb794c2b8))
* CRM update tests + detail page actions for contacts, leads, opportunities ([55fc895](https://github.com/pdovhomilja/nextcrm-app/commit/55fc895be944713923fb36da092978b0ed137c7b))
* **dashboard:** display expected revenue in selected display currency ([7a2fa8f](https://github.com/pdovhomilja/nextcrm-app/commit/7a2fa8fece3fc5a10b35eabc1ebcf5b4dce2a9ff))
* **db:** add better-auth session/account/verification tables and role column ([f1b9412](https://github.com/pdovhomilja/nextcrm-app/commit/f1b9412b12c736f869ab67a46dc59e064263f660))
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
* enrichment from company name + new target fields + convert to account ([a298f68](https://github.com/pdovhomilja/nextcrm-app/commit/a298f681fae3a2e13b73186660eeffbbf49ec037))
* extend get-crm-data to fetch contactTypes, leadSources, leadStatuses, leadTypes ([8671304](https://github.com/pdovhomilja/nextcrm-app/commit/8671304a048f3bff6a0b225699f2e259e42ee1fc))
* **footer:** read app version from package.json ([0052e17](https://github.com/pdovhomilja/nextcrm-app/commit/0052e17aadf5283299da88bc695c4b4124fa48fd))
* **footer:** read app version from package.json instead of env var ([003a728](https://github.com/pdovhomilja/nextcrm-app/commit/003a728b56429230d40058622e7d0f6fb925e150))
* forward triggeredBy to Inngest child events, use getApiKey in per-record functions ([89631e6](https://github.com/pdovhomilja/nextcrm-app/commit/89631e66c18da04923907f8ad354cc7113d6be01))
* full email client (IMAP sync, compose, pgvector search, CRM linking) ([cd00567](https://github.com/pdovhomilja/nextcrm-app/commit/cd005675f6d04270cb6e1ec25638a91f5914a3b9))
* Gmail quick connect — preset, App Password guide, folder discovery ([e394550](https://github.com/pdovhomilja/nextcrm-app/commit/e3945501f95c8e7dd58a48e68dfde69c5294b0a9))
* Gmail quick connect with folder discovery and sync fixes ([c4b5a0a](https://github.com/pdovhomilja/nextcrm-app/commit/c4b5a0aa450b6cdded09a4d6b928c49483457b08))
* implement ActivityForm Sheet component ([be47092](https://github.com/pdovhomilja/nextcrm-app/commit/be470920dd34afd47fb0f6194feb9c4a43c31ea5))
* improve target enrichment drawer and API handling ([8abb383](https://github.com/pdovhomilja/nextcrm-app/commit/8abb3837748eb40e1ddc4b951616399744c8cc35))
* **inngest:** add daily ECB exchange rate sync function ([61e0819](https://github.com/pdovhomilja/nextcrm-app/commit/61e08199f0bf783f7ebbb5230e298b8feafb0c56))
* **line-items:** add line items section to Contract detail page with copy-from-opportunity ([e3235fe](https://github.com/pdovhomilja/nextcrm-app/commit/e3235fe0f8c4c1e468ed239668dcb1d60a46a1ac))
* **line-items:** add line items section to Opportunity detail page ([24436e1](https://github.com/pdovhomilja/nextcrm-app/commit/24436e17a3d043ac1cefed2269cb6bebcf008323))
* **line-items:** add Prisma schema for Opportunity and Contract line items ([f3b1f30](https://github.com/pdovhomilja/nextcrm-app/commit/f3b1f301e464760780dea6402192e71cbfb90de8))
* **line-items:** add server actions for Contract line items with copy-from-opportunity ([baa83d1](https://github.com/pdovhomilja/nextcrm-app/commit/baa83d1b2bcc8401dd895f54c98402727ad8568b))
* **line-items:** add server actions for Opportunity line items ([680fa93](https://github.com/pdovhomilja/nextcrm-app/commit/680fa93ef4d2631b7f71d035804f954966b629a9))
* **line-items:** add shared calculation helper ([825c733](https://github.com/pdovhomilja/nextcrm-app/commit/825c7339302d995094ef595722f5c4f0718e6383))
* **line-items:** add shared LineItemsTable, AddLineItemForm, and EditLineItemForm components ([e839227](https://github.com/pdovhomilja/nextcrm-app/commit/e839227a731660b4c1bd32d9c6206f6ac03c6543))
* **migration:** add currency support migration ([86b7663](https://github.com/pdovhomilja/nextcrm-app/commit/86b76636742c8bc4860de078f3731ac0e36886f9))
* **migration:** add idempotent role backfill script ([287b7fd](https://github.com/pdovhomilja/nextcrm-app/commit/287b7fd7c3f1da1faf9629dcacb0ee97bb511673))
* move enrichment API routes to campaigns namespace ([3e23d76](https://github.com/pdovhomilja/nextcrm-app/commit/3e23d7686b6b02261ef997e31f2c172635e6c2bb))
* move Targets and Target Lists from CRM to Campaigns module ([f162b8e](https://github.com/pdovhomilja/nextcrm-app/commit/f162b8e61126fcfecfde81b84f76ef031e928a7f))
* multi-currency support for Sales module ([19848b0](https://github.com/pdovhomilja/nextcrm-app/commit/19848b0b050cf7f76e1694cc1a608c1f7a558eb2))
* NextCRM v0.1.0 — better-auth, reports, activities, audit log, CRM settings, E2B enrichment ([f552f64](https://github.com/pdovhomilja/nextcrm-app/commit/f552f64f39ba0bd0f0d5b00901023864c7d07afa))
* **opportunities:** add currency dropdown to create/update forms ([49cb1b7](https://github.com/pdovhomilja/nextcrm-app/commit/49cb1b78e2595ee86651fe5ab6c0471856034d50))
* **opportunities:** add snapshot rate lookup on create/update ([f0f8380](https://github.com/pdovhomilja/nextcrm-app/commit/f0f8380a2cc72cac4ede8304a737129ec4f93313))
* **opportunities:** display budget and revenue with currency formatting ([664c096](https://github.com/pdovhomilja/nextcrm-app/commit/664c09645f9f161499e1e3486afda7b6700eeced))
* pass identityOverride through strategy layer, skip email guard ([d16b1cc](https://github.com/pdovhomilja/nextcrm-app/commit/d16b1ccf1f50ec9dd1b17f7ca2ddf8b8fc73ab8e))
* Playwright E2E sales flow tests + CRM form bug fixes ([06d22ca](https://github.com/pdovhomilja/nextcrm-app/commit/06d22caa0e350687e5eb7ef344cc15c63abc3898))
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
* raw SQL migration — convert crm string fields to DB-backed FK relations ([c0eb773](https://github.com/pdovhomilja/nextcrm-app/commit/c0eb77393dee335c32e2b6ff9216b70a5fc0063d))
* register enrichTargetContact in Inngest serve route ([81aa097](https://github.com/pdovhomilja/nextcrm-app/commit/81aa09758cda27faee35bc984b64024fc6cca358))
* replace AgentEnrichmentStrategy with E2B sandbox agent in enrich-target ([083e473](https://github.com/pdovhomilja/nextcrm-app/commit/083e4735e4075cb0453262ba2a7422bd9c5183b9))
* reports module remaster — BI-lite dashboard with exports and scheduling ([a53a6ad](https://github.com/pdovhomilja/nextcrm-app/commit/a53a6adaf6b6915efc58273886f664b557ce339c))
* reports module, CRM enhancements, and E2E test coverage ([6337ff9](https://github.com/pdovhomilja/nextcrm-app/commit/6337ff9fda7c5bc3e80c67725fd6b8fe3450dd99))
* reports shadcn migration, CRM improvements & hotfixes ([b8fae83](https://github.com/pdovhomilja/nextcrm-app/commit/b8fae83d205db94478df287c22c0839d3c69297c))
* **reports:** add accounts report actions with tests ([cc28f57](https://github.com/pdovhomilja/nextcrm-app/commit/cc28f57d992e122f4a3cf7bc51b39c517a8dfbb0))
* **reports:** add activity report actions with tests ([4ad63e3](https://github.com/pdovhomilja/nextcrm-app/commit/4ad63e30ee27c439f8c2ae5955988257bb276047))
* **reports:** add campaigns report actions with tests ([13215e0](https://github.com/pdovhomilja/nextcrm-app/commit/13215e07ecfdaaa097947eccec89641da7a4b05b))
* **reports:** add crm_Report_Config and crm_Report_Schedule models ([af35a78](https://github.com/pdovhomilja/nextcrm-app/commit/af35a786853aad711a19b3e03cd263c54d97886d))
* **reports:** add CSV export with API route ([63a0d60](https://github.com/pdovhomilja/nextcrm-app/commit/63a0d60bcade1e502d2a83bb535bd68841c891f9))
* **reports:** add dashboard KPI action with test ([58e5d17](https://github.com/pdovhomilja/nextcrm-app/commit/58e5d17982bc59db09eae29aa9a7f78e3d65dceb))
* **reports:** add dashboard sidebar link, match card style, fix dark mode charts ([1896430](https://github.com/pdovhomilja/nextcrm-app/commit/189643023b5fc29954d3d9d992df83371889faee))
* **reports:** add DateRangePicker, FilterBar, KPICard, ReportChart, and ReportTable components ([9288a51](https://github.com/pdovhomilja/nextcrm-app/commit/9288a512b8f488333d924b29c8e13c9402768756))
* **reports:** add i18n translation keys for reports module ([02180e2](https://github.com/pdovhomilja/nextcrm-app/commit/02180e282efb2e80a8bc343cca6587531e27e2eb))
* **reports:** add leads & contacts report actions with tests ([ceea14f](https://github.com/pdovhomilja/nextcrm-app/commit/ceea14f0c1435b86ac16b77f2a74edb47b4baf86))
* **reports:** add PDF export, Inngest scheduled delivery, and email template ([bc270cd](https://github.com/pdovhomilja/nextcrm-app/commit/bc270cd7c31574353ba8eeb19b073cd0ba6b972b))
* **reports:** add ReportToolbar, SaveConfigDialog, ScheduleDialog, SavedReportsDropdown, and ReportPageLayout ([b6c48f3](https://github.com/pdovhomilja/nextcrm-app/commit/b6c48f3c9422fb58182cc88f4a088034888aaf5c))
* **reports:** add sales report server actions with tests ([d0f5082](https://github.com/pdovhomilja/nextcrm-app/commit/d0f5082b50d2caf99c7b6ec4acaac76da275a25c))
* **reports:** add sales, leads, accounts, activity, campaigns, and users sub-pages ([63d01a5](https://github.com/pdovhomilja/nextcrm-app/commit/63d01a54b2da2f336503ba207a363b91ceeeed67))
* **reports:** add saved config CRUD actions with tests ([1cbb5a2](https://github.com/pdovhomilja/nextcrm-app/commit/1cbb5a28ad3773371cf21aa093fd49b23ec42723))
* **reports:** add schedule CRUD actions with tests ([9174460](https://github.com/pdovhomilja/nextcrm-app/commit/9174460104b34c7a131ba4dc9f2b16c02ec63717))
* **reports:** add shadcn chart component ([fe98a0c](https://github.com/pdovhomilja/nextcrm-app/commit/fe98a0c16f9725294f51349eaa10d31feec3c516))
* **reports:** add shared types, constants, and filter helpers ([677399d](https://github.com/pdovhomilja/nextcrm-app/commit/677399d29c76b324f4633e783a404333955d4e56))
* **reports:** add users report actions with tests ([7331492](https://github.com/pdovhomilja/nextcrm-app/commit/73314920869eb5a6d8e735b6a086133cb5430698))
* **reports:** convert sales report values to display currency ([3784f7d](https://github.com/pdovhomilja/nextcrm-app/commit/3784f7df9df29567cfe4a443f2fc9fdfefadd1d2))
* **reports:** replace static reports page with KPI dashboard ([dcdd290](https://github.com/pdovhomilja/nextcrm-app/commit/dcdd290373442adc2202d3ed40679458b3dd9979))
* **reports:** rewrite ReportChart with shadcn/ui charts ([c753633](https://github.com/pdovhomilja/nextcrm-app/commit/c753633b53e4b99d353692d53a6fb2918d3a99e3))
* **reports:** update navigation menu item ([6fdaaa5](https://github.com/pdovhomilja/nextcrm-app/commit/6fdaaa58bcb8b36225ba644a02bf45d382c9fe2e))
* **schema:** add Currency, ExchangeRate, SystemSettings models and migrate money fields to Decimal ([bf3f16d](https://github.com/pdovhomilja/nextcrm-app/commit/bf3f16d29532af16e8cd9dae46bb2d570fa6d0fd))
* **search:** add document search to command palette ([a0a5bbe](https://github.com/pdovhomilja/nextcrm-app/commit/a0a5bbe064b358933f33fa8ad1b43c039c64659d))
* **search:** add documents to unified search with keyword + vector similarity ([299736f](https://github.com/pdovhomilja/nextcrm-app/commit/299736fd74c539b65472db021cc8cfe0f1335abd))
* seed default values for crm_Contact_Types, crm_Lead_Sources, crm_Lead_Statuses, crm_Lead_Types ([4cf2a95](https://github.com/pdovhomilja/nextcrm-app/commit/4cf2a95518b55dbf3760d7f4f58bee98b5cff4d2))
* **seed:** add currency and exchange rate seed data ([3da4975](https://github.com/pdovhomilja/nextcrm-app/commit/3da4975b75029a1b7134c875e8f6656849cd73df))
* show empty state with profile link when no mailbox configured ([ff039a3](https://github.com/pdovhomilja/nextcrm-app/commit/ff039a3a4d444bda2f11b7166babdf7c660adf20))
* soft delete + audit log for accounts ([bbb31cb](https://github.com/pdovhomilja/nextcrm-app/commit/bbb31cba9695d4d914cd384aeb6c756f3493253b))
* soft delete + audit log for contacts, leads, opportunities, contracts ([f254be0](https://github.com/pdovhomilja/nextcrm-app/commit/f254be09d8ac6e670de0ce5d9eb11e6f2d5696e2))
* support company-name-only enrichment in AgentOrchestrator ([8c6e57e](https://github.com/pdovhomilja/nextcrm-app/commit/8c6e57e7814b53c6fa4feed56175d73b595e23f9))
* unlock enrichment for targets without email (company name fallback) ([4c9b6b1](https://github.com/pdovhomilja/nextcrm-app/commit/4c9b6b1a8ae1446e5d0cfd7195d7dc51b40136e4))
* update BasicView displays to use FK relation names ([a1140cf](https://github.com/pdovhomilja/nextcrm-app/commit/a1140cf8026e9b98319ef9ba9e459e51cb7bf2a0))
* update lead and contact forms to use Select from DB-backed config values ([b723745](https://github.com/pdovhomilja/nextcrm-app/commit/b7237458ca428a07e999f6690904ea0dc9598328))
* update lead and contact server actions to use FK ID fields ([27f34a2](https://github.com/pdovhomilja/nextcrm-app/commit/27f34a2858993542b01e0c90b38c97a0ecec33c2))
* use getApiKey resolver in enrich routes, return 402 NO_API_KEY ([22001dc](https://github.com/pdovhomilja/nextcrm-app/commit/22001dc0b1d6d5f6fd71229368dddd15bb7db0e5))
* validate field names against FIELD_MAP in enrich routes ([8a84ab4](https://github.com/pdovhomilja/nextcrm-app/commit/8a84ab4982212253015d112f2f26f9fbc614e55a))
* wire ActivitiesSection into all 5 CRM entity detail pages ([8d1a133](https://github.com/pdovhomilja/nextcrm-app/commit/8d1a133fbdf27199cdec865ef3168af4592f0478))


### Bug Fixes

* add 5-minute TTL to skip-list cache ([c56fe94](https://github.com/pdovhomilja/nextcrm-app/commit/c56fe94f65149ce135d56c0f0e1af11edea805e5))
* add 8 missing fields to Inngest targetFieldMap and Prisma select ([123e885](https://github.com/pdovhomilja/nextcrm-app/commit/123e8852584f57c23b55b342a270d6f2962f471b))
* add currency field to contracts table schema ([ed6a675](https://github.com/pdovhomilja/nextcrm-app/commit/ed6a675648110d30aaf57920d9439c0f4c3f88fb))
* add currency to Opportunity schema type and fix implicit any ([a7ab752](https://github.com/pdovhomilja/nextcrm-app/commit/a7ab752aa9c5879ee13600e7565852e0d251f2c6))
* add email and personal_email to bulk enrich field selector ([0338746](https://github.com/pdovhomilja/nextcrm-app/commit/033874626a3d859b49ef6789924c8f8fc1066877))
* add explicit onDelete: SetNull to converted FK relations ([8895e9f](https://github.com/pdovhomilja/nextcrm-app/commit/8895e9fc87124e0aafec4cc0ad1878a546f33574))
* add explicit type annotation for fan-out map parameter ([dba291b](https://github.com/pdovhomilja/nextcrm-app/commit/dba291bb2e9fc902806e41e4be290777202f351a))
* add explicit types to currency map callbacks ([7d4d5a4](https://github.com/pdovhomilja/nextcrm-app/commit/7d4d5a4912b285c7f84974fd08fadef3855c3aa1))
* add explicit types to currency map callbacks in layout ([33e74f4](https://github.com/pdovhomilja/nextcrm-app/commit/33e74f44d2bf16a28a880986803e1247034e294d))
* add line items migration and resolve migration drift ([1b6f483](https://github.com/pdovhomilja/nextcrm-app/commit/1b6f48392cf3801551ed918fd7b379aefe6b4513))
* add missing crm_AuditLog migration ([3afd5d5](https://github.com/pdovhomilja/nextcrm-app/commit/3afd5d5b2f289ab371bedf0c67ff95b13695e963))
* add missing email module migration ([9203d84](https://github.com/pdovhomilja/nextcrm-app/commit/9203d845b7d280c724f676168e3808ed79b454fb))
* add missing soft-delete columns migration ([4e5dc0b](https://github.com/pdovhomilja/nextcrm-app/commit/4e5dc0ba5ba966093d5cb9c3b6c4b96853da37ed))
* add missing soft-delete columns migration for CRM entity tables ([ad4da46](https://github.com/pdovhomilja/nextcrm-app/commit/ad4da468b6035549161989488065652297ac4df0))
* add missing Targets/TargetLists tables to campaigns migration ([2b308d1](https://github.com/pdovhomilja/nextcrm-app/commit/2b308d182cf9cc237eb206886b9f2acd6f58a9f9))
* add missing tiptap dependencies for TipTapEditor ([2acc81e](https://github.com/pdovhomilja/nextcrm-app/commit/2acc81ebf3ee96c8272c05d9ae1da11ce2261c05))
* add try/catch to enrichTarget Inngest function, mark FAILED on error ([dc1472b](https://github.com/pdovhomilja/nextcrm-app/commit/dc1472bbb6714cdbae0c2f62b2ce5d9f1f756898))
* allow empty email in EmailContext Zod schema for company-name path ([9e516db](https://github.com/pdovhomilja/nextcrm-app/commit/9e516db3554942ea74ca52049ade5ab875d2c226))
* **auth:** add modelName mapping for Users table and improve E2E auth setup ([150a6a1](https://github.com/pdovhomilja/nextcrm-app/commit/150a6a1c7790534e3849f746e4e7ed8395cab05d))
* **auth:** fix all build errors — operator precedence, missing imports, type safety ([6466a6c](https://github.com/pdovhomilja/nextcrm-app/commit/6466a6c004d3c6698580cba13733a34c653da0ec))
* **auth:** fix better-auth schema compatibility and E2E test infrastructure ([9560934](https://github.com/pdovhomilja/nextcrm-app/commit/956093441c088303dd7270e0bfe82cff0bc9114d))
* **auth:** fix remaining next-auth imports and E2E test setup ([fb2a3e6](https://github.com/pdovhomilja/nextcrm-app/commit/fb2a3e64201c98945684b8a47572beef6f39717d))
* **auth:** redirect to sign-in after signOut ([2e011c7](https://github.com/pdovhomilja/nextcrm-app/commit/2e011c7ca221ddd732a2e2d451fedd01140c760c))
* **auth:** replace activate/deactivate admin with setUserRole in row actions ([161c41a](https://github.com/pdovhomilja/nextcrm-app/commit/161c41ae5a4c0da5e1f6cf5efed08fa24bbb2543))
* **auth:** resolve Google OAuth user creation failures ([844389a](https://github.com/pdovhomilja/nextcrm-app/commit/844389a689c0f20ab8d75bdf10648beeb829c5e3))
* **auth:** resolve Google OAuth user creation failures ([094e7ee](https://github.com/pdovhomilja/nextcrm-app/commit/094e7ee715c034b7c023a574241871690cee68ad))
* await params in PATCH route for Next.js 16 compatibility, add missing firecrawl dep ([1322882](https://github.com/pdovhomilja/nextcrm-app/commit/1322882ad5773dea5a76c4529912d8adc6c5feb4))
* batch upsert in sync-account to avoid transaction timeout + nodemailer update ([26acb25](https://github.com/pdovhomilja/nextcrm-app/commit/26acb254a9da7f086487b1126552fc9b566adf0b))
* **build:** resolve failed migration before deploy ([d063791](https://github.com/pdovhomilja/nextcrm-app/commit/d0637914f2f296e079afd3fd280be204540c8b60))
* cast contact create/update data as any to resolve Prisma union type conflict ([3ac1ccb](https://github.com/pdovhomilja/nextcrm-app/commit/3ac1ccbc6d914f788d1ea7ebefa60c9ef2c7d904))
* clean build script and protect env file ([db6a2d3](https://github.com/pdovhomilja/nextcrm-app/commit/db6a2d3d67e243d9a390a62673182f2a810dfd4e))
* close pg pool on seed completion ([8193219](https://github.com/pdovhomilja/nextcrm-app/commit/81932196b5988495e329313b01c2f2e8a50b3ca6))
* correct FK field names in lead and contact create/update actions ([45183de](https://github.com/pdovhomilja/nextcrm-app/commit/45183de943a7a9ef4e9b1ea073dccede3042074c))
* correct operator precedence in leads name column cell ([f080e34](https://github.com/pdovhomilja/nextcrm-app/commit/f080e34b607fa5bb195b290a9186b341a8689c20))
* correct revalidatePath pluralization and add includes to activity mutations ([a413421](https://github.com/pdovhomilja/nextcrm-app/commit/a413421dec820c19d917afa508e9bf09eeed3a11))
* **crm:** allow null assigned_to_user in account schema ([d53dfc8](https://github.com/pdovhomilja/nextcrm-app/commit/d53dfc8410662ca0e8c3032635442dacb1d7a70c))
* **crm:** guard assigned_to_user null in account BasicView ([fc28075](https://github.com/pdovhomilja/nextcrm-app/commit/fc28075fc48bc4c51095bff7c55a3e1337188736))
* declare runtime config directly in campaign enrich route ([ffb0a6a](https://github.com/pdovhomilja/nextcrm-app/commit/ffb0a6a6da30e0b82659fc0fc0ba04bb026c198d))
* default accounts prop to empty array in UpdateContractForm ([3e21eac](https://github.com/pdovhomilja/nextcrm-app/commit/3e21eac5fba06aed2e718964995a0b06f7f3ef50))
* discover company domain before agents run; propagate discovered website back to context ([db83930](https://github.com/pdovhomilja/nextcrm-app/commit/db83930191eb7095feb4140bf5c0d10a8041608f))
* **documents:** check upload response status in bulk upload modal ([d71dbf5](https://github.com/pdovhomilja/nextcrm-app/commit/d71dbf52edb03144ba89f3b20e2dc5b4ef9deca1))
* **documents:** exclude pdf-parse and pdfjs-dist from Turbopack server bundle ([6ea7e4b](https://github.com/pdovhomilja/nextcrm-app/commit/6ea7e4bec671046ea396e29930d132dcbe10d6f0))
* **documents:** replace next/image with img tag in DocumentViewModal ([3d2dafd](https://github.com/pdovhomilja/nextcrm-app/commit/3d2dafdae168a2dccc6826d0b897a99351d0c901))
* **documents:** use pdf-parse v2 class-based API for text extraction ([2825f90](https://github.com/pdovhomilja/nextcrm-app/commit/2825f90efc4f2cf97c65901f7c1f7d9f4125db25))
* **documents:** use row.original directly instead of Zod parse in row actions ([20a6016](https://github.com/pdovhomilja/nextcrm-app/commit/20a601665e0e7b24b6a9555eeb298460c4468505))
* **e2e:** update home page test for OTP email auth flow ([33a6847](https://github.com/pdovhomilja/nextcrm-app/commit/33a6847f5d8d46f8b95f776c21f9f7b7a078f0ac))
* ensure tsconfig resolves new e2b enrichment module ([703aef3](https://github.com/pdovhomilja/nextcrm-app/commit/703aef33daeebc760d25c74a7ce8950f10ed5005))
* guard FormSelect against undefined data and pass safe defaults ([91f1a45](https://github.com/pdovhomilja/nextcrm-app/commit/91f1a457083794e2301dda4863376acbc37e7584))
* guard null reassignment, fix revalidatePath locale scope, add updateConfigValue tests ([1836fe8](https://github.com/pdovhomilja/nextcrm-app/commit/1836fe85532d943334b2373cfc3df672e666c5eb))
* guard null upsert key and wrap DB updates in step.run ([f3438d7](https://github.com/pdovhomilja/nextcrm-app/commit/f3438d779823eb0989cd3d0e04f530386159e461))
* import ApiKeyProvider from @prisma/client instead of redefining locally ([ed57514](https://github.com/pdovhomilja/nextcrm-app/commit/ed575144b442a72d22b555e099aaacac1a043827))
* improve enrichment pipeline — E2B agent fixes, EnrichButton, contact fields ([02f9ba3](https://github.com/pdovhomilja/nextcrm-app/commit/02f9ba3e17b213339d931570460723a79ccd20ba))
* improve Playwright test selector reliability and toast assertion ([7f42f32](https://github.com/pdovhomilja/nextcrm-app/commit/7f42f3224dab0066fb3695722ce4aafc01a4b501))
* **inngest:** add gen_random_uuid() to embedding INSERT statements ([a6918b1](https://github.com/pdovhomilja/nextcrm-app/commit/a6918b14e3dc3dcd4080a4d899bf95a26770bb1d))
* last_name fallback in convert-target, add 8 new fields to update-target type ([fa90fbb](https://github.com/pdovhomilja/nextcrm-app/commit/fa90fbb6b6e8f6658b08e577ba22eb2c61092527))
* **line-items:** resolve build and type issues ([211ab7c](https://github.com/pdovhomilja/nextcrm-app/commit/211ab7cf3cc496d08cc522c123323d9159426ecf))
* load .env.local in Jest to fix inngest client initialization ([ad7d3f6](https://github.com/pdovhomilja/nextcrm-app/commit/ad7d3f67debd2c7ade362f235c408b2051c9bb12))
* load both .env and .env.local in Jest setup ([fadbe5f](https://github.com/pdovhomilja/nextcrm-app/commit/fadbe5f045502c1162e71c83f612165c830d87ac))
* make crm_AuditLog foreign key constraint idempotent in migration ([79fe79b](https://github.com/pdovhomilja/nextcrm-app/commit/79fe79b731419e69951c5969c1dc8ee9490c6568))
* make entire campaigns migration fully idempotent ([8776e28](https://github.com/pdovhomilja/nextcrm-app/commit/8776e288dd189ab8673a45466b54ec7d61d0b336))
* make FormSelect fully controlled to show defaultValue correctly ([0c926fc](https://github.com/pdovhomilja/nextcrm-app/commit/0c926fc80a7851d780dd62611b3f63e3596d8d3f))
* **migration:** rename and make idempotent for failed deploy recovery ([3393859](https://github.com/pdovhomilja/nextcrm-app/commit/339385928a7005ff36fbc6a3df64eaf678fa600b))
* **migration:** seed currencies and clean data before VARCHAR cast ([6ca3dcc](https://github.com/pdovhomilja/nextcrm-app/commit/6ca3dccf08960b8cf6c2d1e83c8a8a2632acb75a))
* move TooltipProvider out of ActivityEntry to parent level ([fc4b4a2](https://github.com/pdovhomilja/nextcrm-app/commit/fc4b4a2fc786d637843a61b6cc9a05bb6d346ee5))
* narrow onAgentProgress callback type in enrich route ([373a45a](https://github.com/pdovhomilja/nextcrm-app/commit/373a45aabc604894e8e484ca210052942d288e1b))
* pass agent params via env vars to prevent script injection ([d2ca7d4](https://github.com/pdovhomilja/nextcrm-app/commit/d2ca7d4f59dd0e8b570d87a3c0614500f0610876))
* patch 20 vulnerabilities — update next, aws-sdk, add minimatch/flatted/express-rate-limit/hono/effect/fast-xml-parser overrides ([a4ba421](https://github.com/pdovhomilja/nextcrm-app/commit/a4ba42170dfca6199f5a548fa205b6daa2641594))
* patch transitive dependency vulnerabilities (18 Dependabot alerts) ([da7a437](https://github.com/pdovhomilja/nextcrm-app/commit/da7a437c9e565f5eadd8c28b73bafe92bdeff010))
* patch transitive dependency vulnerabilities via pnpm overrides ([5eef297](https://github.com/pdovhomilja/nextcrm-app/commit/5eef297b0ef10d3b61654c0f6271757adc9eb82e))
* **products:** resolve audit log type errors and build issues ([784c444](https://github.com/pdovhomilja/nextcrm-app/commit/784c444267f635594402f0528be6679e3e9d37d2))
* refactor UpdateContractForm to self-fetch accounts and currencies ([23e1dab](https://github.com/pdovhomilja/nextcrm-app/commit/23e1dabcc8185deb0f93c161d08aa6347a972636))
* relax campaigns targets import validation + target enrichment schema ([ca914c4](https://github.com/pdovhomilja/nextcrm-app/commit/ca914c46e34b26ae093169dadb5d8a34d6face49))
* relax campaigns targets import validation to allow last_name or company ([3ce3dfb](https://github.com/pdovhomilja/nextcrm-app/commit/3ce3dfbedab866dca4af796df87fc9c9626fb480))
* relax campaigns targets import validation to allow last_name or company ([bc56b78](https://github.com/pdovhomilja/nextcrm-app/commit/bc56b78fe9fb7215d55a9347c0fd5b196e0e422e))
* remove any casts from serializeDecimalsList call sites ([10a5fe9](https://github.com/pdovhomilja/nextcrm-app/commit/10a5fe9e8d0530d8993d080cf5b78555840b4709))
* remove conflicting defaultValue from controlled FormDatePicker input ([326f995](https://github.com/pdovhomilja/nextcrm-app/commit/326f995857da1294a86ebb45420c9affc0d579b5))
* remove redundant audit log index and add action enum ([94dfd27](https://github.com/pdovhomilja/nextcrm-app/commit/94dfd2739848475aeb7194b7c03f3902527feccc))
* remove redundant index from crm_ActivityLinks ([75f62fb](https://github.com/pdovhomilja/nextcrm-app/commit/75f62fb25e77bec48ef00836b7655c7794209997))
* remove redundant name indexes, add pre-migration data check comment ([ce90c27](https://github.com/pdovhomilja/nextcrm-app/commit/ce90c270feffd968f919247b2dcf1dcec7a4f6ad))
* remove system_Modules_Enabled from seed file ([b6bf914](https://github.com/pdovhomilja/nextcrm-app/commit/b6bf914fb8d6bfc151c61dc32cc07f322dec0274))
* remove unnecessary type cast in contacts columns Link ([42094c2](https://github.com/pdovhomilja/nextcrm-app/commit/42094c29ae11f9b9c7468777e2c76365aaeaa702))
* remove unused filterByConfidence import ([831aea2](https://github.com/pdovhomilja/nextcrm-app/commit/831aea2c73b8552d22e71cc6d6bf2be40d52c2ea))
* remove unused open state variable from AlertDialogAction ([5bb184b](https://github.com/pdovhomilja/nextcrm-app/commit/5bb184b2e909ea1cd05a6842db8c428c67e6209f))
* rename contactColumn to targetColumn in enrich-target ([a703dec](https://github.com/pdovhomilja/nextcrm-app/commit/a703dec734aa0c6833e96b43d59dd8b2de4690ba))
* rename contactFieldMap to targetFieldMap in enrich-target ([9a866a7](https://github.com/pdovhomilja/nextcrm-app/commit/9a866a7d1cdfbcca88875d3594aa84e5784a6d25))
* rename contactId to targetId in target enrich validate, add updatedBy to PATCH ([f60b99e](https://github.com/pdovhomilja/nextcrm-app/commit/f60b99e2cdd15cca1d3279d0ab510ef4e1dee966))
* rename drop_system_modules_enabled migration to resolve timestamp conflict ([f6809b2](https://github.com/pdovhomilja/nextcrm-app/commit/f6809b2f9dba6694c3bc92744c1b959e50658a1f))
* replace Array.from(Set) with forEach-safe Set copy in EnrichFieldSelector ([7810f4a](https://github.com/pdovhomilja/nextcrm-app/commit/7810f4a88e4b3a93446c329e3559d546ee5aa7ba))
* replace getEnabledCurrencies with proper server action ([614162d](https://github.com/pdovhomilja/nextcrm-app/commit/614162d9a2a70941cf6d338e5ad6c85243d04caf))
* replace Set with plain objects in diffObjects to avoid downlevelIteration TS error ([02d8f10](https://github.com/pdovhomilja/nextcrm-app/commit/02d8f1038904349fc0177d8abddce94506b14067))
* replace SWR with server-side props in UpdateOpportunityForm ([66968d9](https://github.com/pdovhomilja/nextcrm-app/commit/66968d9d846a617b56887e7becce04e751ab6daf))
* **reports:** add explicit types to resolve TypeScript errors ([6a00512](https://github.com/pdovhomilja/nextcrm-app/commit/6a005126f4d9102b55e343cd7384359020085077))
* **reports:** align translation keys between pages and locale files ([44c135c](https://github.com/pdovhomilja/nextcrm-app/commit/44c135c35504f56a4e8e23ba313f872ed8a687d1))
* **reports:** cast filters to Prisma.InputJsonValue for build compatibility ([0bcc7e3](https://github.com/pdovhomilja/nextcrm-app/commit/0bcc7e3163859b3125abb596c8f454512a298ee8))
* **reports:** fix chart colors — use hsl() wrapper and purple palette ([4cb3f18](https://github.com/pdovhomilja/nextcrm-app/commit/4cb3f18bfa53df5034e7d0b7f31f7ff1694499e2))
* **reports:** fix dashboard KPI Prisma field names ([7de30d8](https://github.com/pdovhomilja/nextcrm-app/commit/7de30d804f43f817a289eb173fb6920b6c42dbda))
* **reports:** fix Inngest v4 API and Buffer type issues ([d2bfa56](https://github.com/pdovhomilja/nextcrm-app/commit/d2bfa56acd6affb5bd99f146f90c498b6536376b))
* **reports:** fix Prisma field names in leads and activity actions ([1af7f1e](https://github.com/pdovhomilja/nextcrm-app/commit/1af7f1e7ecf93a0e74e68eb23002796d172abae6))
* **reports:** resolve TypeScript errors with groupedToChartData helper ([57576bd](https://github.com/pdovhomilja/nextcrm-app/commit/57576bd92901c5640b9858fbf6a105f34a9eb2ae))
* **reports:** use created_on for crm_TargetLists in campaigns action ([aefcc51](https://github.com/pdovhomilja/nextcrm-app/commit/aefcc5103d82fc0495da68dca0b78d78815baf01))
* resolve build errors - type casts and Inngest function signature ([0e3bf0f](https://github.com/pdovhomilja/nextcrm-app/commit/0e3bf0f0ae5abed134d9319d460985c4dae7c782))
* resolve build errors and clean up dependencies ([560296b](https://github.com/pdovhomilja/nextcrm-app/commit/560296bc68b7681710f3181cc547a65af4816903))
* resolve failed campaigns migration before deploy ([a89969b](https://github.com/pdovhomilja/nextcrm-app/commit/a89969b195fba0d94a445fe0311507e1b7c19252))
* resolve merge conflict in schema.prisma — keep onDelete: SetNull ([7df22a1](https://github.com/pdovhomilja/nextcrm-app/commit/7df22a13606ff1b7704245ea57956bae93752c04))
* resolve multiple CRM form bugs uncovered by Playwright tests ([2415902](https://github.com/pdovhomilja/nextcrm-app/commit/24159020e3bea5fc7b211625f747ffe84e0ab81d))
* resolve type issues in ECB sync function ([79b2663](https://github.com/pdovhomilja/nextcrm-app/commit/79b266346fada836cb16c971224bc4a9ee502b9b))
* resolve TypeScript errors in AgentOrchestrator company-name path ([5d485da](https://github.com/pdovhomilja/nextcrm-app/commit/5d485da21ec16f9eefb7c0cc24b06474e87b7720))
* resolve TypeScript errors in audit-log utility ([6fda851](https://github.com/pdovhomilja/nextcrm-app/commit/6fda851a5c87e133eff574fb9f0e7805dd606c09))
* route expects targetId (not contactId) in request body ([3722cbb](https://github.com/pdovhomilja/nextcrm-app/commit/3722cbb1265c1de1b441dfd8fa061d2f73d87e68))
* **schema:** add [@db](https://github.com/db).VarChar(3) to crm_Opportunities.currency field ([0ef0b8b](https://github.com/pdovhomilja/nextcrm-app/commit/0ef0b8ba54251aed2900f8dc03558c315025869e))
* **security:** override defu&lt;=6.1.4 to 6.1.5 for prototype pollution CVE-2026-35209 ([507a866](https://github.com/pdovhomilja/nextcrm-app/commit/507a866326a3920e04e38afefdc60bd4140f9de7))
* **security:** patch defu prototype pollution CVE-2026-35209 ([29d187d](https://github.com/pdovhomilja/nextcrm-app/commit/29d187d2ab56fc7ec78913563864c2f7093c9c1b))
* serialize Decimal fields before passing to client components ([ff68db2](https://github.com/pdovhomilja/nextcrm-app/commit/ff68db28f40b01111cf56ccd4b6d822f3e69cf24))
* serialize Decimal fields in getAllCrmData for client components ([8451299](https://github.com/pdovhomilja/nextcrm-app/commit/845129965078a0260c7cdc2a82a5a326104e38f4))
* serialize opportunity Decimal fields before passing to client component ([bed1604](https://github.com/pdovhomilja/nextcrm-app/commit/bed16042018525b18b9e2c59ace7f74568e1e574))
* split currency lib into client-safe and server-only modules ([1a61be3](https://github.com/pdovhomilja/nextcrm-app/commit/1a61be3b404ce10b85e50769b76dba1a8037477c))
* stabilize flaky e2e tests across CRM modules ([dbb88b6](https://github.com/pdovhomilja/nextcrm-app/commit/dbb88b69fbe5dd013d7ea61d0da0c72036fbe3b2))
* **tests:** update sales report tests for currency-aware aggregation ([c02d752](https://github.com/pdovhomilja/nextcrm-app/commit/c02d7524a9636eb1ea2f2e81f27cb303833db81e))
* udpate inngest client ([a719bc5](https://github.com/pdovhomilja/nextcrm-app/commit/a719bc598bd77245f4a108c48901cf116b8bc2fe))
* update @vercel/mcp-adapter to v1.0.0 and add to trusted builds ([e1583c2](https://github.com/pdovhomilja/nextcrm-app/commit/e1583c2a7d87f6fc1790f0e0432d4812308988a7))
* update ImportTargetsModal client-side preview validation to match new rules ([fcc7451](https://github.com/pdovhomilja/nextcrm-app/commit/fcc7451131695b95203e78ac9d1597b7a3f77c66))
* updated inngest app id ([2c95a3f](https://github.com/pdovhomilja/nextcrm-app/commit/2c95a3ff7b9c1a0187417ff09de0ea24acb7e7cc))
* UpdateOpportunityForm Zod id max(30) → uuid() for UUID opportunity IDs ([01cd260](https://github.com/pdovhomilja/nextcrm-app/commit/01cd26048c89f6ae90315de5be713252be00658a))
* use || for optional UUID fields in updateOpportunity action ([29126e8](https://github.com/pdovhomilja/nextcrm-app/commit/29126e859adf22be50e5d4a346c345d81eeb1bda))
* use || instead of ?? for optional UUID fields in update actions ([1402c70](https://github.com/pdovhomilja/nextcrm-app/commit/1402c70768c02cddcb09a5691e1d2efa66d508c9))
* use company website domain when email is personal; scrape contact page for email/phone ([8f448c4](https://github.com/pdovhomilja/nextcrm-app/commit/8f448c490217e5db56e7dc2e27ea27b851e7dd9e))
* use correct revalidatePath format in convert-target action ([61779da](https://github.com/pdovhomilja/nextcrm-app/commit/61779dad375e82cfedaaa5334711bc1976eecc51))
* use LOWER() case-insensitive match in contact type backfill ([47cbd59](https://github.com/pdovhomilja/nextcrm-app/commit/47cbd5946fe418b673389a924e2352ff3810a969))
* use named prismadb export in crm-settings actions and tests ([1af2cc3](https://github.com/pdovhomilja/nextcrm-app/commit/1af2cc3d4214f581bf134f0fbab39cfe28af6e26))
* use relative import in crm-settings test to avoid [locale] path resolution ([0259142](https://github.com/pdovhomilja/nextcrm-app/commit/0259142afc97be42a3a44e9b715ce2b5e42c699e))
* use ternary for unknown changes field in AuditAdminTable JSX ([bea59f9](https://github.com/pdovhomilja/nextcrm-app/commit/bea59f927de3ed090abe8cb480bb165703697285))
* use useSearchParams in AdminFilters and add sonner toast on restore error ([36e2e26](https://github.com/pdovhomilja/nextcrm-app/commit/36e2e26bc3eb538fd96f5036b08219afef18c4d1))
* use z.email() for Zod v4 compat, fix null string in buildCompanyNameContext ([56b8804](https://github.com/pdovhomilja/nextcrm-app/commit/56b88043b0822d157578a619b3b23b028369fa0f))
* use z.uuid() (non-deprecated) for id fields in all CRM update forms ([626997d](https://github.com/pdovhomilja/nextcrm-app/commit/626997d20f494c9c0ebb713cd366d4af4db76d29))
* widen cast via unknown for target column lookup in enrich-target ([f5ab3f0](https://github.com/pdovhomilja/nextcrm-app/commit/f5ab3f07ae810e929e78fbfada2878fb2145c5e5))
* wire currencies prop through opportunity and contract components ([dba0036](https://github.com/pdovhomilja/nextcrm-app/commit/dba0036335819f598ec430f165cad8edf55b8213))
* wire pagination and align types for admin audit log page ([1ec1531](https://github.com/pdovhomilja/nextcrm-app/commit/1ec1531fa801d68d09ccd6d11abbe693ee35fa14))
* wrap NoApiKeyDialog siblings in fragment in enrichment components ([f9bee28](https://github.com/pdovhomilja/nextcrm-app/commit/f9bee285a44548ca859c51c1a7bf4c0cd8d2205a))

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
