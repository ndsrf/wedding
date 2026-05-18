# [2.0.0](https://github.com/ndsrf/wedding/compare/v1.4.0...v2.0.0) (2026-05-18)


### Bug Fixes

* add billing field to CreatePlannerRequest type ([37a1cd6](https://github.com/ndsrf/wedding/commit/37a1cd60632dddd401fde4f837a01256fd89399c))
* add contract_id to baseWedding fixture and type test params ([8f6ce27](https://github.com/ndsrf/wedding/commit/8f6ce27c4ed2c31312169f498594a9710e650770))
* add customer_id and contract_id to Wedding interface in models.ts ([a5785e1](https://github.com/ndsrf/wedding/commit/a5785e1e5a48c500f9bbe2e6211d85f7c64f583b))
* add eslint comment to suppress no-unused-vars for type field ([f53aa14](https://github.com/ndsrf/wedding/commit/f53aa149a885d8ed22657f7761a31ebc1018fbba))
* add explicit type annotation to resolve circular inference error ([7f89a7e](https://github.com/ndsrf/wedding/commit/7f89a7ec7bc0e2febc14c74e368a475f6a7ce8ea))
* add follow-redirects override to fix header leakage vulnerability ([8506ced](https://github.com/ndsrf/wedding/commit/8506ced0ef3fcc61cca6b3f00fe06a438619c592))
* add GET handler for customer by ID to fix edit wedding client dropdown ([b6d326b](https://github.com/ndsrf/wedding/commit/b6d326bb47c697bddbb7340f65f03b1ee6672f7d))
* add main_event_location to PlannerStats upcoming_weddings type ([e7c94f1](https://github.com/ndsrf/wedding/commit/e7c94f1e17649622c8704a94cc6497ddd2dbc30a))
* add main_event_location to stats API and narrow fetched fields ([b680ef4](https://github.com/ndsrf/wedding/commit/b680ef4ddcd35a3a5cb9ea33900e3e90d0fd1f97))
* add missing cache invalidation to bulk/import guest handlers ([717f4a3](https://github.com/ndsrf/wedding/commit/717f4a3f519467100cc0da43e816138424370b0d))
* Add specific script to deploy vector db changes in Vercel ([d50a6ef](https://github.com/ndsrf/wedding/commit/d50a6ef1cc58b5857ccbbcca25755a872ee9bffb))
* add wedding_admin creation to seeding script for E2E auth ([7eaaaf0](https://github.com/ndsrf/wedding/commit/7eaaaf050639d9480af3765f8143ad5cd4049092))
* address code-review issues from Gemini bot ([b23f81e](https://github.com/ndsrf/wedding/commit/b23f81e7762fe2d906097f2e956b57f5e75da543))
* address Gemini code review on alert system ([a72fbf4](https://github.com/ndsrf/wedding/commit/a72fbf4a340f74c8adbea8248ccd814747375e52))
* address Gemini code-review security and quality issues ([fb758c0](https://github.com/ndsrf/wedding/commit/fb758c049802207ceda6ae8d903e289df057560c))
* address race conditions, payment migration, redundant query and type safety ([5dd4da7](https://github.com/ndsrf/wedding/commit/5dd4da7d681f11395495ad8f9e3d6034a59d4533))
* address review feedback on finanzas consolidation ([d69cba2](https://github.com/ndsrf/wedding/commit/d69cba2d978ccb79372c84dea7da6de04b2d6a80))
* addressed the "Unexpected token '<'" error by fixing the middleware and resolving a route conflict. ([69717a5](https://github.com/ndsrf/wedding/commit/69717a5ed813ede80c9f3b50868253d0031c0daa))
* **alert-settings:** show alert rows immediately with disabled defaults ([1651ace](https://github.com/ndsrf/wedding/commit/1651acec7cf59917c016a4efc36db32097788133))
* another try to fix instrumentation ([9e67a1d](https://github.com/ndsrf/wedding/commit/9e67a1d6bce6c96190bab572b41d260ee0ab7e0f))
* apply review feedback on create-wedding e2e test ([d2e28da](https://github.com/ndsrf/wedding/commit/d2e28da86b00374a44725b0a6ecc604e089e2737))
* auto-regenerate invoice PDF after edit, show View & Payments for DRAFT ([2854e8f](https://github.com/ndsrf/wedding/commit/2854e8f2bca0eb6ee5b7b859a7ea2cfcd3407ae4))
* bump hono override to ^4.12.7 (GHSA-v8w9-8mx6-g223) ([66257de](https://github.com/ndsrf/wedding/commit/66257dece468f9192aab67b5bbbf7fd88b5118b6))
* cast renderToBuffer result to Buffer to resolve TypeScript type mismatch ([ae5ad5b](https://github.com/ndsrf/wedding/commit/ae5ad5bd3b129c12135b7b79a0e03d29308356b4))
* change cron schedule to daily for Vercel Hobby plan compatibility ([0f8797c](https://github.com/ndsrf/wedding/commit/0f8797ce028cc4c4267ba7727b56c9451d0e5230))
* change Wedding.tasting_menu to one-to-many relation ([c6ffe39](https://github.com/ndsrf/wedding/commit/c6ffe39d7dafac5d0d3ee84c5303fca1319a0a70))
* comprehensive csp update for arcade and vimeo ([2b02c59](https://github.com/ndsrf/wedding/commit/2b02c5973a5f81c5c245ba89a046456985fda169))
* compute due_date server-side to always use today's UTC date ([116257a](https://github.com/ndsrf/wedding/commit/116257ae7e408d3725664fe60fe52c7ef1b9226b))
* contract stale PDF, manual sign button, and DocuSeal archive logging ([006988a](https://github.com/ndsrf/wedding/commit/006988a64e693b9505222d08a6d65214c0f5e97c))
* convert Decimal to number for planned_gift_per_person in admin wedding PATCH ([8a6c80d](https://github.com/ndsrf/wedding/commit/8a6c80d43845c2f13b9e2f0d081e2d3c0ea2c8de))
* convert Decimal to number for planned_gift_per_person in planner weddings list routes ([fecae79](https://github.com/ndsrf/wedding/commit/fecae797f23e5b68c5e354d1773900494fc75ac6))
* copy .npmrc into Docker deps stage to enable legacy-peer-deps ([7a95f11](https://github.com/ndsrf/wedding/commit/7a95f117fc48dcd938af2b84972d637530d636b7))
* copy discount from quote when creating invoice ([401ed12](https://github.com/ndsrf/wedding/commit/401ed12b04dfb17e1e57a1c1c4e296c4e1d5f348))
* correct Spanish translations for company profile title and subtitle ([d4bae2d](https://github.com/ndsrf/wedding/commit/d4bae2d089e6dc9aaf6d7afd0d65702a9ca1948a))
* correct TypeScript types in WeddingNotesEditor ([008f6e7](https://github.com/ndsrf/wedding/commit/008f6e74ea8c9c67af6192b1ac043a875306d699))
* create dedicated notes-mention-task endpoint for Reminders section ([7c425aa](https://github.com/ndsrf/wedding/commit/7c425aaef87ee8f489ce54878182255b1d938b4e))
* **deps:** update dependency @google/genai to v2 ([e4a95ec](https://github.com/ndsrf/wedding/commit/e4a95ecc21aebf0837cf6875a4c291fdfcf8b444))
* **deps:** update dependency @hyperdx/browser to ^0.23.0 ([81e495c](https://github.com/ndsrf/wedding/commit/81e495cc0eb039988c8e1668ad9a930d24109c7d))
* **deps:** update dependency @opentelemetry/instrumentation-undici to ^0.24.0 ([9a581e6](https://github.com/ndsrf/wedding/commit/9a581e67b1a218309a9e51013fa33d510034748d))
* **deps:** update dependency @opentelemetry/instrumentation-undici to ^0.25.0 ([8ce0718](https://github.com/ndsrf/wedding/commit/8ce07185809ba8d656d6549bbefd21417bcc6a6d))
* **deps:** update dependency @opentelemetry/instrumentation-undici to ^0.26.0 ([313c42b](https://github.com/ndsrf/wedding/commit/313c42bef4514553253251b421b50ae3b97b3c4b))
* **deps:** update dependency @opentelemetry/instrumentation-undici to ^0.27.0 ([d2f4457](https://github.com/ndsrf/wedding/commit/d2f445779e1334f83b5bc018b3a23ca36240fbd0))
* **deps:** update dependency @react-email/components to ^0.5.0 ([bc84730](https://github.com/ndsrf/wedding/commit/bc8473011ec63ac7928d08fe5b448ccb1eff3cdc))
* **deps:** update dependency @react-email/components to v1 ([414b970](https://github.com/ndsrf/wedding/commit/414b9703646866686a57e880dcd2826d9ab28193))
* **deps:** update dependency @vercel/analytics to v2 ([3140e93](https://github.com/ndsrf/wedding/commit/3140e93221431c830855e53bb01cb322bf4b4ed0))
* **deps:** update dependency @vercel/blob to v2 ([7ffa4dd](https://github.com/ndsrf/wedding/commit/7ffa4dd7b23f02b18a2c6c7ffaa8fc9671088741))
* **deps:** update dependency @vercel/speed-insights to v2 ([e1c33b3](https://github.com/ndsrf/wedding/commit/e1c33b33b8e0d060a072523ac56d51e63fe762d4))
* **deps:** update dependency diff to v8 ([9c76ed5](https://github.com/ndsrf/wedding/commit/9c76ed51183a1f3b58beb33cdaeb6ae76acae57c))
* **deps:** update dependency diff to v9 ([a8fd3cd](https://github.com/ndsrf/wedding/commit/a8fd3cd455304dbba82482940d3223b1c53d6ea8))
* **deps:** update dependency isomorphic-dompurify to v3 ([238c0a9](https://github.com/ndsrf/wedding/commit/238c0a95868e70adc77103109e75eb8533bb6c0a))
* **deps:** update dependency lucide-react to ^0.577.0 ([e1de4bc](https://github.com/ndsrf/wedding/commit/e1de4bcb53d01bf29050fe3d859822638baaed51))
* **deps:** update dependency lucide-react to v1 ([a787184](https://github.com/ndsrf/wedding/commit/a787184f05cceb78db65e5a1c78db2b03629f411))
* **deps:** update dependency resend to v6 ([5ca5c48](https://github.com/ndsrf/wedding/commit/5ca5c48529f29d51ed7993428012a8d7af929514))
* **deps:** update dependency twilio to v6 ([718df5f](https://github.com/ndsrf/wedding/commit/718df5f30c839ab4c6be3c60bd3ea8ebffc60001))
* DocuSeal webhook signature verification uses plain secret comparison ([695ba7c](https://github.com/ndsrf/wedding/commit/695ba7c60de42fa1fafa76ade0a69e20dbd13cf6))
* downgrade @vercel/otel to ^1.14.0 to resolve otel peer dependency conflict ([daa3c2d](https://github.com/ndsrf/wedding/commit/daa3c2d45b292bd96c19d68d927856eced17d8bd))
* drop lingering unique index on contracts.quote_id ([abb4d44](https://github.com/ndsrf/wedding/commit/abb4d440db383c7921af004ba14ea9730642e28b))
* **e2e:** resolve failures after tailwindcss v4 upgrade ([356949b](https://github.com/ndsrf/wedding/commit/356949b763e455c08415abfbe9e6b6166aed5b0b))
* eliminate n+1 queries in mcp tools and remove noisy auth logging ([b14deb7](https://github.com/ndsrf/wedding/commit/b14deb794632388596e8587d4c7016b92839dc41))
* eliminate stale data across all cached API routes ([0b56113](https://github.com/ndsrf/wedding/commit/0b561134f271597a71cef1be15ebeef89d84c518))
* embed logo as base64 data URI in all PDF generators ([9729e37](https://github.com/ndsrf/wedding/commit/9729e37c476ede0129d53cad4d4be6a39f6d5115))
* enable DocuSeal email notification and correct 1-based page indexing ([ca046dc](https://github.com/ndsrf/wedding/commit/ca046dc9b8ff7c65035c994735f5aa0dcf076135))
* exclude type field from Prisma create in createStage ([4010b88](https://github.com/ndsrf/wedding/commit/4010b88f0bda6fc489e951e0116e87a453e97339))
* exclude type field from Prisma update in updateStage ([e0aace9](https://github.com/ndsrf/wedding/commit/e0aace9747465360200bb8b606e6c8ebd08f30f4))
* fallback signing/wedding dates and i18n schedule invoice errors ([a95da3b](https://github.com/ndsrf/wedding/commit/a95da3bef3e232c0008329fa8384d1ca4ebd5121))
* generate mention task title server-side in user's preferred language ([4d41370](https://github.com/ndsrf/wedding/commit/4d41370f5bd000f18a74a76f1896c497ffbca312))
* give twilio its own https-proxy-agent v7 via nested override ([f0b85fb](https://github.com/ndsrf/wedding/commit/f0b85fb195805a2d5f859ef60c6952cde374eb7d))
* guard quote expiry update against concurrent status changes ([838a611](https://github.com/ndsrf/wedding/commit/838a611ce81cd82b97bd55fd1fbd4c3ce0a68145))
* **guests:** add top pagination nav, standard header on planner guests page ([a7b047f](https://github.com/ndsrf/wedding/commit/a7b047fefe38024aea4cc535ab548043fd7c1f15))
* **guests:** always show pagination controls regardless of page count ([47d70c7](https://github.com/ndsrf/wedding/commit/47d70c75ffaacdbfb58c4bef1b301f693f1328af))
* **guests:** split excel import into row-by-row transactions to avoid timeouts ([f498be9](https://github.com/ndsrf/wedding/commit/f498be9a3ff05a3eefefe0e979d35b5e9c4eab60))
* handle empty-string discount and tax_rate in quote schema ([fcb29ec](https://github.com/ndsrf/wedding/commit/fcb29ec7a9aca881468e58e9b48b1208bf5a387e))
* handle nullable numero in allocateInvoiceNumber ([090b2e5](https://github.com/ndsrf/wedding/commit/090b2e5a9060a556a00602ef76a4e978a7c7e7ca))
* handle nullable numero in convert-to-invoice ([1d3a6d5](https://github.com/ndsrf/wedding/commit/1d3a6d5f5ba6497e8592ad0c7ac4e33f9d27e1cb))
* import createPortal from react-dom not react ([7843738](https://github.com/ndsrf/wedding/commit/7843738b00f0439735b1252e20ae9501bdd00d73))
* improve error handling and localization for admin invitation ([d8fc048](https://github.com/ndsrf/wedding/commit/d8fc048117a5d1f9d6d0e56225ddf3e4ae66fabd))
* improve NupciBot state persistence and prep planner layout ([ed85dcf](https://github.com/ndsrf/wedding/commit/ed85dcf65d03d0b3476cfc3ce57be13517a12c82))
* improve text selection in contract editor and comment sidebar ([57928d2](https://github.com/ndsrf/wedding/commit/57928d273510ec071309888ec92f1932ebe65ea9))
* include customer_id and contract_id in admin wedding GET response ([851633b](https://github.com/ndsrf/wedding/commit/851633b435cbbb34e11ab750c089b6d704b6d4f6))
* instrumentation fixes ([3d9228f](https://github.com/ndsrf/wedding/commit/3d9228fe9b1c2e8cf1d6dd267eb6049dce9a01ec))
* Instrumentaton with opentelemetry ([c05a569](https://github.com/ndsrf/wedding/commit/c05a569025c348e85057ba16b91a502991ee395b))
* invalidate planner wedding caches on guest mutation ([8d92f40](https://github.com/ndsrf/wedding/commit/8d92f400782f12776375fd9add9951a0e2f8ce52))
* invoice detail discount/tax display, force PDF regeneration after edit ([486f592](https://github.com/ndsrf/wedding/commit/486f592bebf00c432b09018b2c332c56a7248742))
* localize task strings, add currentUser to planner notes page ([37f672b](https://github.com/ndsrf/wedding/commit/37f672b3172caef031f85333997352f9b44afcc6))
* **locations:** include itinerary-item weddings in location wedding panel ([20d871d](https://github.com/ndsrf/wedding/commit/20d871d7c0e49871e8c5faa380f7178e63124a98))
* **locations:** resolve ESLint errors in locations page ([e2320ea](https://github.com/ndsrf/wedding/commit/e2320ea2b32eb3a4572959a5cfb5d0513b3d3612))
* log warning when doubled-content repair fails ([31386b1](https://github.com/ndsrf/wedding/commit/31386b1b11beeb6b5e9fda2d8ac612b1d165b478))
* **logo:** make the logo bigger ([577fb32](https://github.com/ndsrf/wedding/commit/577fb32f35c02c6c64cc004e56bd3db2f20d526c))
* make BulkEditModal content panel render above backdrop ([4d32d38](https://github.com/ndsrf/wedding/commit/4d32d38df947b21440d6bba58caa7fdee45ba977))
* make invoice_number unique per planner, not globally ([d569944](https://github.com/ndsrf/wedding/commit/d56994466b0be92304dd44b3bf7fe01c7118c4c8))
* map sendForm keys to signer_email/signer_name before POST ([4834b88](https://github.com/ndsrf/wedding/commit/4834b889380dda155ce8b518f0b14c42b6275db9))
* match invoice PDF flow to quotes pattern exactly ([483c6c2](https://github.com/ndsrf/wedding/commit/483c6c2748b6d4955f2def9512f7719dee292b8e))
* **mcp:** add claude support websockets, sse transport ([61e4263](https://github.com/ndsrf/wedding/commit/61e4263637b375bb48f2cac0a5937a757b3894b3))
* **mcp:** add missing database migration script ([2170903](https://github.com/ndsrf/wedding/commit/21709030345fbe51dbe91a705cbd83dbc3b2367a))
* **mcp:** api key as get  url parameter ([a49b6f2](https://github.com/ndsrf/wedding/commit/a49b6f2b6309a6c864802c6205010a0782ec9cb2))
* **mcp:** exclude mcp-server folder from normal build as it is a subfolder with its own dependencies ([8fd9af3](https://github.com/ndsrf/wedding/commit/8fd9af34654bc33ebf280552b3b0d0a2a743b042))
* mock prisma in wedding-assistant unit tests to avoid database_url requirement ([bdcdbb6](https://github.com/ndsrf/wedding/commit/bdcdbb6cd6e3d8c51e27c7112d19777c09743330))
* more instrumentation issues ([ba7a45d](https://github.com/ndsrf/wedding/commit/ba7a45d6d6df401198edbc33067a7fa9e21de7a7))
* move payment planning fields out of base Wedding interface ([a5e018d](https://github.com/ndsrf/wedding/commit/a5e018d7d82874f65fc61a6a14f376772fa76ab9))
* move template fields into documents[] per DocuSeal /templates/pdf API spec ([0b9b7e4](https://github.com/ndsrf/wedding/commit/0b9b7e4f117e2a9fa660d711c8d77e6859db9dd5))
* multi-tenant phone/email uniqueness and active-wedding scoping ([196a625](https://github.com/ndsrf/wedding/commit/196a62515c961ad6fc87b1e3fe2daf9926c63770))
* nest DocuSeal fields inside submitter object, not top-level ([8759c16](https://github.com/ndsrf/wedding/commit/8759c162a954b08da2bc939c7d47b7d3147e18f0))
* normalize quote form data before sending to API ([2addeaa](https://github.com/ndsrf/wedding/commit/2addeaa99e4d292964c0bb851b934b95a18dfa66))
* **nupcibot:** restore properly formatted References section in chat ([a9df4f3](https://github.com/ndsrf/wedding/commit/a9df4f3d986f5214e450f3d42ccc9bb1515ba2b5))
* pass user object to verifyWeddingAccess instead of planner_id ?? id ([dc09bcb](https://github.com/ndsrf/wedding/commit/dc09bcb1b4847e7a5260c320575fd63dbb73d348))
* patch critical/high/moderate security vulnerabilities ([68208ee](https://github.com/ndsrf/wedding/commit/68208ee5a5f8ec9f7193ec5bb3e8f21cfe91e224))
* pin https-proxy-agent to v5 for twilio to resolve ESM require() error ([ddf4f17](https://github.com/ndsrf/wedding/commit/ddf4f17a50542a601a5eef6f67b46530ae09d923))
* **planner-export:** stable quote reference, ISO dates, chronological revenue sort ([650505c](https://github.com/ndsrf/wedding/commit/650505cefa0c97bd77d69a8b61bbf1f65c6b17b4))
* **planner:** collapsible assignee columns + i18n regression in widget ([9b78075](https://github.com/ndsrf/wedding/commit/9b780751fb2ff4166f11cd1d9a66062d0a3713d2))
* populate id_number and address when creating invoice from contract/quote ([beb8916](https://github.com/ndsrf/wedding/commit/beb891651caa8791d204dc9ccc67ac7b5cb16c7c))
* prefix unused type variable with underscore to satisfy linter ([a80743e](https://github.com/ndsrf/wedding/commit/a80743eb2af6800bef8092070c7e27dcde4621f0))
* prevent contract content duplication on edit/view open ([6cd4a20](https://github.com/ndsrf/wedding/commit/6cd4a20385dec0cb9af7aac0538c6a35e725d7a5))
* prevent contract template from appending on every editor open ([08a671a](https://github.com/ndsrf/wedding/commit/08a671a53676837a2df559f6822104037421fa84))
* prevent double-clicks during MANUAL mode clipboard copy ([b6ff637](https://github.com/ndsrf/wedding/commit/b6ff637bf5a90761b22c678cf3f29a4091ba421f))
* prevent resource leak by assigning cleanup immediately after resource creation ([c478782](https://github.com/ndsrf/wedding/commit/c478782e423d1dc7a0b412f7b05fe84441e9a240))
* **prisma:** cast pool to any in PrismaPg adapter to resolve type mismatch ([24a1ddd](https://github.com/ndsrf/wedding/commit/24a1ddd6e54a065fded6200db64f84b70092df00))
* **prisma:** cast pool to any in vector-prisma adapter ([3a4b597](https://github.com/ndsrf/wedding/commit/3a4b597209db41314387746ef63aad415b23f661))
* propagate main_event_location to all remaining location display points ([01f46c4](https://github.com/ndsrf/wedding/commit/01f46c4f01de33a157eca8bba166a81526ddec68))
* **providers:** sort wedding providers and payments by creation and date ([aca9439](https://github.com/ndsrf/wedding/commit/aca9439a76ec0d43c845aefd2cec51bf12587ebe))
* quotes/contracts/invoices PDF caching, edit modes, and feature additions ([b1e40c1](https://github.com/ndsrf/wedding/commit/b1e40c164577a7cd34dd0de3647c3f55bbb44054))
* **quotes:** add loading state and error feedback to new version button ([aa38a5c](https://github.com/ndsrf/wedding/commit/aa38a5ca6a16fc1c74d4203e57c0dfb0fda22d0b))
* **quotes:** delete previous version PDF blob when creating a new version ([e4285c2](https://github.com/ndsrf/wedding/commit/e4285c29617ff8da864a86c04960c280966b5df1))
* refine WhatsApp Manual mode behaviour and set WhatsApp as default channel ([135c439](https://github.com/ndsrf/wedding/commit/135c4397e10cdb583c250e6879ea1514f4317736))
* regenerate invoice PDF inside PATCH handler to eliminate staleness ([eb7d67a](https://github.com/ndsrf/wedding/commit/eb7d67aa7a57757e6dfb1bf19b9c125c5c960f53))
* reliably save signed PDF URL from DocuSeal webhook ([ff203b8](https://github.com/ndsrf/wedding/commit/ff203b882ba8074d139cc7dce57a3a643c209c6c))
* remove ::uuid cast from $queryRaw — IDs are stored as text ([bddf9b6](https://github.com/ndsrf/wedding/commit/bddf9b6b603830a81f2b3f7027a16c0890735c80))
* remove browser-side Cache-Control on wedding detail API ([faffafe](https://github.com/ndsrf/wedding/commit/faffafee957170bf2c8f73e403e93b8f842ebf71))
* remove ES2018 regex 's' flag to restore compatibility ([26ed321](https://github.com/ndsrf/wedding/commit/26ed3217d6ad77c6a1cd09a2c6835b0eb4704b49))
* remove excess planned_gift_per_person property from admin wedding PATCH response ([449d5c4](https://github.com/ndsrf/wedding/commit/449d5c4dc85eb3bcfb32c8b57db4d0503d6fc61c))
* remove invalid disableScrolling from Step objects (not a Step prop) ([680131f](https://github.com/ndsrf/wedding/commit/680131fcf3841124e02ce1fd72b2fdcf1a91c9a7))
* remove unknown eslint-disable directive for react-hooks/exhaustive-deps ([2fe31e8](https://github.com/ndsrf/wedding/commit/2fe31e87115e6c1a4f125185d65d43dfb669197a))
* remove unused isDraftOrProforma variable in InvoicesList ([569fe72](https://github.com/ndsrf/wedding/commit/569fe72d18428770b8710224a1d2d3da3fc053c0))
* rename --spacing to --theme-spacing to avoid Tailwind v4 conflict ([f3eda89](https://github.com/ndsrf/wedding/commit/f3eda892791a2fa8dc678a70223fcec9428cf6f5))
* repair contract content duplication and prevent DB corruption from Liveblocks state ([20eaa60](https://github.com/ndsrf/wedding/commit/20eaa60f78483198a540aa96b94e58bba6cfd721))
* replace fixed timeout with proper waits in create-wedding e2e test ([147b455](https://github.com/ndsrf/wedding/commit/147b45512d91e40ed858665235c3e016d9dc18c0))
* replace invalid select+include mix with nested select in notes-users ([2691d04](https://github.com/ndsrf/wedding/commit/2691d048be64001f38092eed0a1c0f72ff77802c))
* replace pdf-parse with zero-dep PDF page counter ([8ca7aa2](https://github.com/ndsrf/wedding/commit/8ca7aa235c15630cfc20cb0fb9dc00d385bf30e4))
* replace saveMsg string check with ok boolean for locale-safe styling ([77f8678](https://github.com/ndsrf/wedding/commit/77f8678e36f0786ddddee3af11544558a69ef7f3))
* resolve axios security vulnerabilities by upgrading to v1.16.0 ([bc45ef9](https://github.com/ndsrf/wedding/commit/bc45ef97531b641b19484c18c74fd7e8f67f6df1))
* resolve build errors in contract history API ([64c5c2a](https://github.com/ndsrf/wedding/commit/64c5c2a4151b5faf0964cde6173f495de80f6e84))
* resolve defu prototype pollution vulnerability (GHSA-737v-mqg7-c878) ([3b03470](https://github.com/ndsrf/wedding/commit/3b034702206c17cd6f3356a0af39f8dcb5366a89))
* resolve effect GHSA-38f7-945m-qr2g via npm override ([4e90bf1](https://github.com/ndsrf/wedding/commit/4e90bf1d6fd26ba9dfaf54dd94dfe9ed301b1d0e))
* resolve flatted vulnerability and improve API error handling ([311b5a1](https://github.com/ndsrf/wedding/commit/311b5a1eb01dd946a23e5011cbb0fa475eb66735))
* resolve LiveblocksYjsProvider type error with Room parameter cast ([84557ba](https://github.com/ndsrf/wedding/commit/84557ba3729c2c58792c0ed86871891c319b5228))
* resolve missing peer deps for TipTap collaboration ([b4a7cc3](https://github.com/ndsrf/wedding/commit/b4a7cc3b314220beed82f9c40df4d6928ab4ac2f))
* resolve npm audit vulnerabilities via npm audit fix ([abab9b7](https://github.com/ndsrf/wedding/commit/abab9b718f7580ed1b23182136673c1514edebe7))
* resolve PDF caching race condition, stale-PDF indicator, signed contract link, image-to-PDF ([f064d5c](https://github.com/ndsrf/wedding/commit/f064d5c06810f6ca217880db1ee42530dbd7ef41))
* resolve protobufjs vulnerabilities in dependencies ([2f6b977](https://github.com/ndsrf/wedding/commit/2f6b9779a6d7a449bd2ee004b8bdb4492b3ce00d))
* resolve syntax error in docs amp route ([d309ce3](https://github.com/ndsrf/wedding/commit/d309ce3f039f33b94a2272ca4e59fb9da68e35fe))
* resolve syntax error in GuestFormModal ([b5ed1cd](https://github.com/ndsrf/wedding/commit/b5ed1cd6afa3ef401483a47aefa0b3935c41d3be))
* resolve t.rich runtime error and cleanup linting ([1cdf648](https://github.com/ndsrf/wedding/commit/1cdf64885772a50e54012a58d10040b4e495227c))
* robust previous-hash lookup and transactional billing config fetch ([3218e93](https://github.com/ndsrf/wedding/commit/3218e93a55ae3d06f2544364e6afb11a0e6439d9))
* Security issues with babel ([4840682](https://github.com/ndsrf/wedding/commit/4840682c60691c0d2cb4cef4dfa7624e8cf7b957))
* seed Yjs doc from DB content on new rooms + add Create Wedding button ([a0ed80b](https://github.com/ndsrf/wedding/commit/a0ed80b5fca126c5043017db93f19aacd939aed6))
* send PDF as base64 to DocuSeal instead of a public URL ([c2482e8](https://github.com/ndsrf/wedding/commit/c2482e815dfdcd72bc657a3824ea95ffec65061d))
* send PDF as data URI (data:application/pdf;base64,...) to DocuSeal ([8009664](https://github.com/ndsrf/wedding/commit/80096641f149a281a4ee783c7c8c8663eabb29d7))
* skip admin wedding API and hide planned guests for planner view ([52a48b8](https://github.com/ndsrf/wedding/commit/52a48b86237fad0c24adc3adc4e7933733d1844e))
* skip wedding_planners query for non-planner roles during session revalidation ([3fe5790](https://github.com/ndsrf/wedding/commit/3fe5790aa3efcfd4b74f723b75adb703160727d3))
* sub-account planners blocked by wrong ID in verifyWeddingAccess ([b11f246](https://github.com/ndsrf/wedding/commit/b11f24683d6abae1823fe4e308e1512fbdc6883e))
* support multiple planners (sub-accounts) in notes users API ([6a92e21](https://github.com/ndsrf/wedding/commit/6a92e21340b93cf536adf90c25c3562225e1b81d))
* suppress flatted GHSA-25h7-pfq9-p65f false-positive in security audit ([b43227a](https://github.com/ndsrf/wedding/commit/b43227ad5289494d7311a58563de964323d44ad1))
* tax breakdown, race condition, and error formatting in schedule invoices ([80bb1c4](https://github.com/ndsrf/wedding/commit/80bb1c4be01075e11390953f77c72d1a5b923aa0))
* **test:** remove unused _omit variable in notes-mention-task test ([4bd5b15](https://github.com/ndsrf/wedding/commit/4bd5b15d7bd0792f48d47cb23085201fbf65b4f4))
* three alert system correctness issues from code review ([ad5e087](https://github.com/ndsrf/wedding/commit/ad5e08749d7a33a096b5b8e7fb3ec49b6135522c))
* three code review issues in payments page ([3b51fb7](https://github.com/ndsrf/wedding/commit/3b51fb7901f252ba6023005586c483e1513a1cc6))
* **tools:** guide AI to use memberUpdates for individual-member RSVP changes ([962c56a](https://github.com/ndsrf/wedding/commit/962c56a8acd126834ed7f54f81340958623b2312))
* translate hardcoded strings in notes editor and endpoint ([6d0a578](https://github.com/ndsrf/wedding/commit/6d0a57841bfb673e76e1ed2b0dfa131e3b123886))
* unique blob URL per PDF generation to bust immutable CDN cache ([4fda231](https://github.com/ndsrf/wedding/commit/4fda231df674e62de1874c01de386ef1511cec6e))
* update admin invitation error handling and localization ([baa72d9](https://github.com/ndsrf/wedding/commit/baa72d979126e856b428f0253416bb8b031f1e09))
* update checklist-access tests for new user-object signature ([cdfc3c3](https://github.com/ndsrf/wedding/commit/cdfc3c331a8fbf7521a04b3303ef459119f21d76))
* update csp to allow arcade and vimeo embeds ([e33144f](https://github.com/ndsrf/wedding/commit/e33144f78dd90e945379dd9e2f1c490f8fbda860))
* update flatted 3.3.4 → 3.4.1 to patch GHSA-25h7-pfq9-p65f ([b2c5522](https://github.com/ndsrf/wedding/commit/b2c5522c1808e7739429924efe903ee0d783af42))
* update https-proxy-agent to v8 and add twilio as server external ([0617ed8](https://github.com/ndsrf/wedding/commit/0617ed8e24fe11139256dae73ea40841eab77be6))
* update lodash to 4.18.1 to resolve GHSA-r5fr-rjxr-66jc and GHSA-f23m-r3pf-42rh ([fd3a2ab](https://github.com/ndsrf/wedding/commit/fd3a2abeec5b82786435fa4660fcf786263e6899))
* update lodash to 4.18.1 to resolve high severity CVEs ([b0b0bda](https://github.com/ndsrf/wedding/commit/b0b0bdaae6996a023e1d3c54a5c24b62493d8666))
* update package-lock.json to resolve hono 4.12.7 ([4b7dc82](https://github.com/ndsrf/wedding/commit/4b7dc82a50b6cf8c2d5e295b2d82ded36083323b))
* update tasting menu localization across multiple languages ([b143ae9](https://github.com/ndsrf/wedding/commit/b143ae9d07fa1caaa9a078d4098464d2417d89b7))
* update Twilio inbound webhook to use findMany for tasting menu ([b19ab65](https://github.com/ndsrf/wedding/commit/b19ab654146613008d49688467c5e34a3b20eab7))
* upgrade undici to resolve high severity vulnerabilities ([6c1a8c8](https://github.com/ndsrf/wedding/commit/6c1a8c8944f5e932ad0f25419388f7bb376a0427))
* use @/lib/i18n/server instead of next-intl/server for locale detection ([5c3c798](https://github.com/ndsrf/wedding/commit/5c3c7986306b8eb3f1473591fc20dfea64d73ea7))
* use Buffer.from() before base64 encoding PDF for DocuSeal ([8b4f98f](https://github.com/ndsrf/wedding/commit/8b4f98f3a6bd4d7cf16822f3881e2f53f96c336f))
* use contract relation instead of contract_id in InvoicesList ([484344b](https://github.com/ndsrf/wedding/commit/484344ba9152d8c83ccd3dbcaed10399b428b3da))
* use expires_at (valid until) as the quote due date, not a separate field ([27fc642](https://github.com/ndsrf/wedding/commit/27fc6422ebc20371ca44eeb75034abb2a47d326a))
* use generic eslint-disable for missing react-hooks plugin ([ac03966](https://github.com/ndsrf/wedding/commit/ac03966043d7f24979267ffcbea8dd4517892160))
* use main_event_location in dashboard upcoming weddings query ([2786624](https://github.com/ndsrf/wedding/commit/2786624debeeb4f09d0a659b5897ce7ca75ba7d9))
* use main_event_location name as wedding location when set ([b084fe8](https://github.com/ndsrf/wedding/commit/b084fe8e1e252efc1d29fe48a9e77a18519c8a64))
* use Next.js Link instead of anchor tags for tab navigation ([c41b488](https://github.com/ndsrf/wedding/commit/c41b4889db74a2397df68b689821ea413286ff0e))
* use npm override to resolve @opentelemetry/resources peer dep conflict ([7270daf](https://github.com/ndsrf/wedding/commit/7270daf94c67777ae2364ba0be40f3b7f03e6ddd))
* use require() for pdf-parse to resolve ESM default export build error ([be03be3](https://github.com/ndsrf/wedding/commit/be03be341fbbc03f232d6ea985b2bbba20acff08))
* use SetContentOptions object instead of boolean for setContent ([f95a640](https://github.com/ndsrf/wedding/commit/f95a640fda3dcf455ccc32ff7e54175670ddfdd7))
* use waitUntil() for reliable background dispatch on Vercel Hobby ([2e993d4](https://github.com/ndsrf/wedding/commit/2e993d4e2777bdbec187428dedf66adfd98fb6b1))
* Vercel specific timeouts when ingesting ([2d6f576](https://github.com/ndsrf/wedding/commit/2d6f57683255357c0a7994fbf415ae88c380d761))
* widen buffer type annotation to resolve Buffer<ArrayBuffer> vs Buffer<ArrayBufferLike> error ([80a21ec](https://github.com/ndsrf/wedding/commit/80a21ec3a51408fcf2bcf55a535489ffbd6ed841))
* wire HYPERDX_API_KEY into @vercel/otel OTLP exporter for DB stats ([424858d](https://github.com/ndsrf/wedding/commit/424858d6c0a324bece6ac636fa3e76bc66ffe532))


### Features

* add 3 extra loading steps (~10s more) during trial account creation ([80ee8d7](https://github.com/ndsrf/wedding/commit/80ee8d74051280e68daa73abebd4a38bf29e901c))
* add AI contract filler to New Contract panel ([f3c261b](https://github.com/ndsrf/wedding/commit/f3c261b51db4e52c05c3bc674d523d48f27a3692))
* add AI-powered menu generator to /planner/weddings/[id]/menu ([649ece8](https://github.com/ndsrf/wedding/commit/649ece8c4e504118d3ff04c8bf3343b3223c75fc))
* add arcade demo, vimeo tutorials and update pricing ([d1793e4](https://github.com/ndsrf/wedding/commit/d1793e40fcd62a6be98a51f523c03ed71a31a803))
* add async multi-channel alert system ([ad2a835](https://github.com/ndsrf/wedding/commit/ad2a8355a65f14daae86f86669111f16148e45b7))
* add billing series config to planners and show prev hash in invoice PDF ([a85b60f](https://github.com/ndsrf/wedding/commit/a85b60fba3f71f0535e696f3e556d1d6d83afdc4))
* add client dropdown to edit wedding page ([8077369](https://github.com/ndsrf/wedding/commit/80773691163e656e2993b9c7e0a66294bce6332e))
* add collaborative Notes page for weddings ([b208cd0](https://github.com/ndsrf/wedding/commit/b208cd03343008c696708d43bb88d808a1bcd483))
* add contract change history panel ([68e9cce](https://github.com/ndsrf/wedding/commit/68e9cce2c8e093f3f88a8d24356d72db5749af63))
* add Create Contract action to accepted quotes ([416c529](https://github.com/ndsrf/wedding/commit/416c5293b25e5c77447310e0a38bb435196ab2dc))
* add Customer entity, reorder tabs, rename Contract Templates to Contracts ([ad8a289](https://github.com/ndsrf/wedding/commit/ad8a28945b5f323f10b7bc0436faba5ae3f9ded9))
* add date range filter to quotes-finances stats ([6b81769](https://github.com/ndsrf/wedding/commit/6b817693493798eddd47fde4be9e229a00f5ae93))
* add detailed server-side logging to DocuSeal integration ([bee25f5](https://github.com/ndsrf/wedding/commit/bee25f59096dd92526079f99e5f15dc4cbec0be8))
* add documentation link below arcade demo on landing page ([10fc173](https://github.com/ndsrf/wedding/commit/10fc1734594ca7cada334bc3d22c16d5fa1aaa67))
* add email verification step to trial signup ([c5c6ad4](https://github.com/ndsrf/wedding/commit/c5c6ad4c4f275607b20b263506a4a75eb39eac39))
* add first-time demo tutorial for wedding planners with react-joyride ([1b599de](https://github.com/ndsrf/wedding/commit/1b599ded15fdd59f5b5b90e83eb48a9c10ba7f12))
* add license limits, usage tracking, ai chat enhancements, and new ui components ([a1054c6](https://github.com/ndsrf/wedding/commit/a1054c654c1d71048c3687cc575b383275b08f2a))
* add location info (address, website, Google Maps, notes) to AI system prompt ([a2ff38a](https://github.com/ndsrf/wedding/commit/a2ff38adb45fbc2b920f111bbbd4ddd8abcdbd55))
* add multiple tasting rounds support ([66bf90b](https://github.com/ndsrf/wedding/commit/66bf90bfd8a60e685469dede7328606f072ebc88))
* Add notification cache via Redis ([93e51d6](https://github.com/ndsrf/wedding/commit/93e51d681a6fb752c520c30f9ae2cd27d9177738))
* add page titles to all admin and planner pages ([5afac81](https://github.com/ndsrf/wedding/commit/5afac81c399cf03b3c859c9f8a825914b6bbf429))
* add payment schedule to contract templates and contracts ([9d7f0a0](https://github.com/ndsrf/wedding/commit/9d7f0a042df60fc40d80f4710752b55dce6f2e48))
* add price type per category, budget tracking, and Cuenta de Resultados ([cfa8fa7](https://github.com/ndsrf/wedding/commit/cfa8fa7283db58b7b17b17ecbcfe2083a64c14f8))
* add proforma invoice system with contract grouping ([1364e9c](https://github.com/ndsrf/wedding/commit/1364e9cd8bd4ca378f722edc1a86c7e9d91fc740))
* add Quotes & Finances feature for wedding planner income management ([632f931](https://github.com/ndsrf/wedding/commit/632f931dca5cfc3406c5261e776dd80c4b9263d4))
* add selected menu context to WhatsApp AI replies ([7a3f753](https://github.com/ndsrf/wedding/commit/7a3f753e5fdfbd2b8275c28b00623fc8148f2e2d))
* add tasting menu date and status with auto open/close behaviour ([28800e3](https://github.com/ndsrf/wedding/commit/28800e30f73244d05600bd4c6e806d79d90cd178))
* add trial signup flow, trial mode banner, and planner demo seed ([603b2a3](https://github.com/ndsrf/wedding/commit/603b2a39dfbbd1c922e9d069f2b9794dbe227688))
* add WhatsApp Manual mode to replace the separate copy button ([778ef1b](https://github.com/ndsrf/wedding/commit/778ef1b5a92f8fe2516e392ed2584810be9b9344)), closes [#352](https://github.com/ndsrf/wedding/issues/352)
* add word-level diff viewer to contract history ([3a666d7](https://github.com/ndsrf/wedding/commit/3a666d76a28e0b71dd376c6bf25808f56584bf96))
* adding better instrumentation for opentelemetry (prisma, network, etc) ([9ed338a](https://github.com/ndsrf/wedding/commit/9ed338a0cba94a612b720cb904eb3a96c138dc1e))
* admin phone number field with WhatsApp routing via NupciBot ([87f1bf9](https://github.com/ndsrf/wedding/commit/87f1bf9ef1509046e9768627910d853018f6cb90))
* Agentic AI and RAG features: now you can perform actions with NupciBot and also ask questions about all the documents uploaded ([40f55ea](https://github.com/ndsrf/wedding/commit/40f55ea2cc738f07fe3275d49afeecf30c56e444))
* **ai/tools:** add age similarity as third ranking criterion for table suggestions ([452a802](https://github.com/ndsrf/wedding/commit/452a8026c46d1073a1b6a0cc338abf3467769171))
* **ai/tools:** add table seating tools and improve RSVP + docs URL handling ([6cada4b](https://github.com/ndsrf/wedding/commit/6cada4bc31bcdaeb9c90494e767853c68af7a037))
* alert settings UI, quote expiry detection, cron plugin system ([fd1f7ec](https://github.com/ndsrf/wedding/commit/fd1f7ecc88c84c25bd677c33a460e732701cee27))
* allow planners to delete draft contracts ([f7a34dd](https://github.com/ndsrf/wedding/commit/f7a34dd2841013f4150f55d16bb425c18a8ad0da))
* careers page ([22a8685](https://github.com/ndsrf/wedding/commit/22a8685f4b41091a00d185f4f6c01d6a5ac9b5b8))
* consolidate finanzas page for admin and planner ([fba3436](https://github.com/ndsrf/wedding/commit/fba34366b765609da4481ec75ab1cfa62eaf9af5))
* consolidate guests page and API routes (admin + planner) ([b2c5449](https://github.com/ndsrf/wedding/commit/b2c54493f6fd15c66272963a2b96afda32e298fe))
* consolidate payments page for admin and planner ([ae55a1b](https://github.com/ndsrf/wedding/commit/ae55a1b92f6bfff9c4b0a6e844dbd9ba1765e0f7))
* consolidate reports pages and add planner-level cross-wedding reports ([7af63ab](https://github.com/ndsrf/wedding/commit/7af63ab444b0e1b4c532b7fce30af37a254fa76f))
* consolidate Tasting screen (UI + API) ([c1a1acb](https://github.com/ndsrf/wedding/commit/c1a1acbac0a385fd319ad3172e07aad7da426898))
* data-driven feature cards, persona tabs on /docs, role-aware PLATFORM_DOCS ([100a24b](https://github.com/ndsrf/wedding/commit/100a24beec02e21b862ead2268006863d35a6f25))
* **db:** add migration for alert system tables and enums ([decd3d5](https://github.com/ndsrf/wedding/commit/decd3d52f6f09760b359e605b901ee7bd9f8d0a6))
* default due date to 30 days for quotes and invoices ([a739143](https://github.com/ndsrf/wedding/commit/a739143109ea472f9a8d2343cf2324080459fb75))
* differentiate nupcibot and crisp chat buttons and update tutorial ([21acf41](https://github.com/ndsrf/wedding/commit/21acf4117cd5a179f488efcdc01137fa93f5cdd5))
* download and store signed+audit PDFs in own storage on DocuSeal webhook ([0914a29](https://github.com/ndsrf/wedding/commit/0914a29441fd37b804eef18af0d45ab87cacf376))
* enhance landing page with video hero, improved resources navigation, and i18n updates ([ade1f7a](https://github.com/ndsrf/wedding/commit/ade1f7a15767234b6d219d7a987bbc478b4dcd55))
* Enhance notification caching and performance metrics ([4e190d3](https://github.com/ndsrf/wedding/commit/4e190d3e89f5abca5a7907ae0fb5ee4b3fd7cc91))
* Enhance performance and UI consistency across public and admin layouts ([708f0b9](https://github.com/ndsrf/wedding/commit/708f0b984a5cc7a6786672aae0d22748b8badfba))
* enrich AI menu generator with guest profile and tasting score counts ([48245c4](https://github.com/ndsrf/wedding/commit/48245c4a43691ec929ba971218190375ffd50b8e))
* expand joyride tour to 22 steps across planner dashboard and wedding detail pages ([fbaa884](https://github.com/ndsrf/wedding/commit/fbaa884025d56c46399139569fbf41a93e5758ab))
* extend loading messages to 10 steps + infinite cycling fallback ([24d29ee](https://github.com/ndsrf/wedding/commit/24d29eef594eccbe75517a98288700b64cd7e6d6))
* fix quotes/invoices UX and add dedicated dashboard section ([bb97ccb](https://github.com/ndsrf/wedding/commit/bb97ccbc9b75f859f39d6739e793db4f51670e3f))
* **guests:** colapse guest filters, etc on mobile + batch rsvp update + logo width and height ([209fc12](https://github.com/ndsrf/wedding/commit/209fc1265508c0e4c4488433fd935a6ae0d04b31))
* **guests:** paginated guest list with Redis caching, enhanced controls, and cross-page select all ([194783b](https://github.com/ndsrf/wedding/commit/194783bdd959e384d18f20390bea8871460c8336))
* **i18n:** add extended loading step translations for de and fr ([e7ed3ae](https://github.com/ndsrf/wedding/commit/e7ed3ae56640bc8faf33931877a13c25fdffc3cc))
* **i18n:** add multilanguage support to planner quotes-finances page ([0c3835c](https://github.com/ndsrf/wedding/commit/0c3835c8271d7bf6ca0c5b9aff2ba0be522aa66b))
* **i18n:** translate page header, dashboard section, QuoteForm and InvoiceForm ([aa0bc4b](https://github.com/ndsrf/wedding/commit/aa0bc4b624fce0dd54036a819f3bc15fc4f1fb03))
* Implement enhanced caching for notification counts with stampede protection ([dddaf9e](https://github.com/ndsrf/wedding/commit/dddaf9ee4d580cfd19709b1fd492a3f2aaabc4a9))
* improve ai contract fill with language detection and today's date ([9c8f659](https://github.com/ndsrf/wedding/commit/9c8f659179ee1681dedd7ebd6cc5dcf56bb82001))
* include quote line items summary in schedule invoice descriptions ([8fc94c3](https://github.com/ndsrf/wedding/commit/8fc94c3dd5a7e8537a1b70dc68e38beea3884214))
* link wedding to customer and contract for traceability ([649692b](https://github.com/ndsrf/wedding/commit/649692bc6cce0e6c2aaa37dad8b71c36f647803a))
* **locations:** add tag filter pills ([b412d45](https://github.com/ndsrf/wedding/commit/b412d4581ccc55b5a9cd689e64f18a55f891d35f))
* **locations:** add wedding links, tags, and name filter ([2a21c14](https://github.com/ndsrf/wedding/commit/2a21c1450077fafd5efaffaf2892d5ff68eb8c54))
* manual-sign audit PDF, invoice edit for drafts ([80cdb07](https://github.com/ndsrf/wedding/commit/80cdb07356b562ab99b26fa60af2eac7b81119cc))
* **mcp:** implement mcp server and api key management for admin and planner ([f4a79f3](https://github.com/ndsrf/wedding/commit/f4a79f322884b4cce84066d3f6a1446db9cabddd))
* **menu:** consolidate admin and planner menu screens ([067cd99](https://github.com/ndsrf/wedding/commit/067cd99124919842aef75005d10216ca5940ed79))
* multi-user license tiers for wedding planner accounts ([9fa88c5](https://github.com/ndsrf/wedding/commit/9fa88c585cb3a2f036e3235b76fee5f4dd688e24))
* **nupcibot:** add planner nupcibot ([56b2109](https://github.com/ndsrf/wedding/commit/56b21095bf98f3f13bb955b9f9b3a10b8125c2d1))
* **nupcibot:** translated References heading in both chat and WhatsApp ([b20e32d](https://github.com/ndsrf/wedding/commit/b20e32d564fee4b1ec60fca306eae9e17e51fc14))
* **planner:** add OTHER column + fix checklist cache invalidation ([a03d389](https://github.com/ndsrf/wedding/commit/a03d389195ceff8bed1973cfe77ff438c3afc9ad))
* **planner:** split Tareas Próximas into planner vs couple columns ([74b8375](https://github.com/ndsrf/wedding/commit/74b8375cbad02dafe37e83e70904b766fc9c86b4))
* **quotes:** add budget versioning with chain linking and latest-only list view ([c5f4f21](https://github.com/ndsrf/wedding/commit/c5f4f21abe992d9350b09c26bf66f0f671d9bdc5))
* **quotes:** version history dropdown in view panel and version on PDF ([74c45ff](https://github.com/ndsrf/wedding/commit/74c45fff0f000f96876b77b45e5c6a88ce913d66))
* Reminder skill for NupciBot (using checklist) ([8fd2914](https://github.com/ndsrf/wedding/commit/8fd29141a5e81e09295af6f90e6e89cad28c7de0))
* replace client-name badge with Quote/Contract navigation badges ([ba0d44b](https://github.com/ndsrf/wedding/commit/ba0d44b96ebc4b638dd0b654bdff9bd485dca10c))
* replace code input with 6-box OTP widget ([aff89c5](https://github.com/ndsrf/wedding/commit/aff89c57b599da56b1f93894c8cc5a91abdd448c))
* replace Dropbox Sign with DocuSeal for contract e-signing ([bc92b72](https://github.com/ndsrf/wedding/commit/bc92b72956e9a561ee34714220e7043e02f9c376))
* respond in wedding language and fill all menu categories ([65b34f2](https://github.com/ndsrf/wedding/commit/65b34f2b9814ddf4f6b6807ef81d3ab814226046))
* **seed:** demo wedding uses WhatsApp Manual mode with save-the-date enabled ([8b62cdb](https://github.com/ndsrf/wedding/commit/8b62cdb48465003b9d666af8a47966cd046f75d0))
* show NupciBot across all admin pages with persistent conversation ([f524e8f](https://github.com/ndsrf/wedding/commit/f524e8f003770b19209c171fdac7dd88212b331c))
* **tasting:** Add support for WhatsApp content templates in participant messaging. Implement validation for content template ID and update message sending logic to utilize the new template system. ([f309c15](https://github.com/ndsrf/wedding/commit/f309c15ff229b55350c8f2c32d3f02848fcd1879))
* Update typography and remove unused font preloads ([1961d18](https://github.com/ndsrf/wedding/commit/1961d1803f9d58800e2b1704d915d236ca230328))
* use vector RAG for admin WhatsApp replies when enabled ([e2b8234](https://github.com/ndsrf/wedding/commit/e2b82349971d1d2910faf960ae4bf19de22b284b))


### Performance Improvements

* **guests:** fix Redis caching efficiency issues ([12aa6c5](https://github.com/ndsrf/wedding/commit/12aa6c5c85f0f8423181f09572d8b44f262a5ea3))
* **locations:** memoize activeWeddings/pastWeddings in WeddingPanel ([02521e0](https://github.com/ndsrf/wedding/commit/02521e0ebb6472dcdd9f5c1f39b3295d6d247a55))
* **planner:** eliminate N+1 queries, consolidate counts, add caching ([4ba44e3](https://github.com/ndsrf/wedding/commit/4ba44e3c012485dcf4850ab273d2c612e527855b))
* **tools:** O(1) member lookups and remove redundant DB query ([8651494](https://github.com/ndsrf/wedding/commit/8651494a52cca802d7ab24611ca86408f2733ce2))
# [1.4.0](https://github.com/ndsrf/wedding/compare/v1.3.0...v1.4.0) (2026-03-07)


### Features

* **seating:** Enhance seating configuration and layout features. Add support for table types, colors, dimensions, and layout elements. Update UI to include new options for table configuration and layout management. Implement API changes to handle new seating attributes and layout saving functionality. ([b04e101](https://github.com/ndsrf/wedding/commit/b04e1016827f0e9bb548d8ea0c96def7a21769b2))
* **tasting:** Implement search functionality for dishes in tasting menu, including filtering sections based on user input. Update UI to display search results and no-results message. Add translations for search-related text in multiple languages. ([ed3efb9](https://github.com/ndsrf/wedding/commit/ed3efb9d0a7d8d59e2aac383a94debd26d3e014c))



# [1.3.0](https://github.com/ndsrf/wedding/compare/v1.2.1...v1.3.0) (2026-03-07)


### Bug Fixes

* Add new variables for tasting menu in the template preview and whatsapp variables ([c25d993](https://github.com/ndsrf/wedding/commit/c25d9938926a5b18636c6308903f237f76f962db))
* BigInt serialization, admin context ($2), chat box at top ([f16aa89](https://github.com/ndsrf/wedding/commit/f16aa8984602f6e5ab68b1c73316c51a2f39c2e5))
* **config:** make output:standalone conditional on DEPLOYMENT_TARGET=docker ([5e414bc](https://github.com/ndsrf/wedding/commit/5e414bc198959d5622239150b74df317251d7846))
* **docker:** set DEPLOYMENT_TARGET=docker in Dockerfile and CI build ([0e51ee1](https://github.com/ndsrf/wedding/commit/0e51ee1d28c15b515422d776cae62f69a10b1262))
* Fix tasting menu template migration screen issues ([c8098e0](https://github.com/ndsrf/wedding/commit/c8098e0fa6e467c7743f60b3707b4620056e0154))
* Fix tasting menu template migration screen issues ([6bd6bdc](https://github.com/ndsrf/wedding/commit/6bd6bdcbaedffda97613bb99f4b5a1f537754ebc))
* **middleware:** explicitly handle root path routing to avoid 404 ([88791b4](https://github.com/ndsrf/wedding/commit/88791b41b609d4d43b6197c381acd331824fc793))
* **migration:** Cast language and channel fields to "Language" and "Channel" in tasting menu migration SQL ([c6cd904](https://github.com/ndsrf/wedding/commit/c6cd9040bc18d39607f176786c52fe404c6cdfcf))
* **migration:** Cast template type to "TemplateType" in tasting menu migration SQL ([c5e1435](https://github.com/ndsrf/wedding/commit/c5e14358f844276d7242e7cef18c5e190832fe73))
* **migration:** Cast template type, language, and channel fields to their respective types in planner message templates migration SQL ([4b45ea1](https://github.com/ndsrf/wedding/commit/4b45ea16276d1030d8c4e890080b7d5010934aed))
* pass exact number of SQL parameters to avoid PostgreSQL bind error ([14a832b](https://github.com/ndsrf/wedding/commit/14a832be30d119c075dd23575a2ac4cb90edcd2d))
* remove Cache-Control from guest list endpoints to prevent stale data after add/delete ([5ccb72b](https://github.com/ndsrf/wedding/commit/5ccb72be03fcc7f5e04151c9343619cc5a5a8fb0))
* **tasting:** correct Parameters index for Language type in send routes ([f0f303b](https://github.com/ndsrf/wedding/commit/f0f303b17608220f77aff65f53b975e6cd0c4707))
* **tasting:** remove lingering whatsappMode prop from planner tasting page ([dd2a860](https://github.com/ndsrf/wedding/commit/dd2a86052c1663ef5ad201c23e862c70427d997d))
* **tasting:** remove unused whatsappMode prop to resolve ESLint error ([86d2cbc](https://github.com/ndsrf/wedding/commit/86d2cbc050d5aedccb521b39a5c8e63250744511))
* **tests:** update Gemini mock to @google/genai SDK ([9f38cce](https://github.com/ndsrf/wedding/commit/9f38ccec0b644388412b810039ee80a3ee3c6d5c))
* **vcf:** correct N-field name order; sort guest list alphabetically ([94b3012](https://github.com/ndsrf/wedding/commit/94b3012fd93f0c72b46b7ffbee8f5111c0d4438c))
* **vcf:** decode QUOTED-PRINTABLE encoded names in vCard 2.1 files ([37e6981](https://github.com/ndsrf/wedding/commit/37e69815ad28f06ec9b15fcba6479a5d21f01736))
* **vcf:** handle base64 photo padding, iOS groups, charset, and case validation ([40783cb](https://github.com/ndsrf/wedding/commit/40783cb9499a6a89765314101a8f7d0466975931))


### Features

* add invitation template export/import (.nupcinv format) ([7f37799](https://github.com/ndsrf/wedding/commit/7f37799cf9ea9581cb44f824ea8e8953ce19dcc4))
* Add Menu page to select the final menu from the tasting menu options ([49a2ad9](https://github.com/ndsrf/wedding/commit/49a2ad98b8798456aeb19c63c6c88aad565b1bf6))
* add natural-language query chat box to /admin/reports ([8eb5265](https://github.com/ndsrf/wedding/commit/8eb52650bf10ab5102e0a2cc76bd9013252cac74))
* add Redis caching, fix N+1 queries, and add DB indexes for /admin and /planner performance ([f8796ce](https://github.com/ndsrf/wedding/commit/f8796ce2910db15603cef5b5278c5f9f340602ea))
* add tasting menu experience for admin and planner ([7b03c84](https://github.com/ndsrf/wedding/commit/7b03c84e03eec1dbf9aac51df4ed18d6e6c68f00))
* default notifications to unread, add read/all filter, add DB indexes ([5c64b8d](https://github.com/ndsrf/wedding/commit/5c64b8dcfbd616c37e1f44b713e16eb631327d77))
* Moved tasting menu messaging templates to the standard templates page ([59055cd](https://github.com/ndsrf/wedding/commit/59055cdb97478b2831b8ced33a8f3cb27a4ef086))
* **tasting:** add dish inline editing and AI menu import from PDF/image ([d01c347](https://github.com/ndsrf/wedding/commit/d01c34727fe649d0a410aba85d7f08e5ee432347))
* **tasting:** auto-save scores and resume on page reload ([dff3ba8](https://github.com/ndsrf/wedding/commit/dff3ba84a285059b75bd9d781ee93680711c25aa))
* **tasting:** edit participants, language per participant, template fix, public page language selector ([da56e99](https://github.com/ndsrf/wedding/commit/da56e99243e37667cffbf534f44f9f4234dfde86))
* **tasting:** Enhance tasting scoring system: update score range from 1-5 to 1-10, adjust UI components accordingly, and implement collapsible sections for better user experience. Update translations for score display and photo upload options in multiple languages. ([bc9055b](https://github.com/ndsrf/wedding/commit/bc9055b78524fbf35f3dc5d59cd4416ca4f36030))
* **vcf:** import spinner + duplicate phone dedup ([52c5cdb](https://github.com/ndsrf/wedding/commit/52c5cdbd6d1c3bcc1c9b3b42f4f33aeb0e3c063e))



## [1.2.1](https://github.com/ndsrf/wedding/compare/v1.2.0...v1.2.1) (2026-03-01)


### Features

* Links from nupcibot are shown at the end the message so it is clear ([0214d0f](https://github.com/ndsrf/wedding/commit/0214d0f8ccf1dbee83ec54f9cadf84d73d2ffc94))



# [1.2.0](https://github.com/ndsrf/wedding/compare/v1.0.0...v1.2.0) (2026-03-01)


### Bug Fixes

* add missing id field to WeddingData type and setWeddingData call ([57e30e9](https://github.com/ndsrf/wedding/commit/57e30e987b1114b6caca8374969231b86cbef1b6))
* add missing main_event_location_id field to test fixture ([53b94eb](https://github.com/ndsrf/wedding/commit/53b94ebc37f7d2be8ecdd359aeca2ceea1d21847))
* add missing planner reminders and save-the-date API routes ([44f4846](https://github.com/ndsrf/wedding/commit/44f484607305eec721a1d3d695f8a41c989ca088))
* add prisma migrate deploy to build script for Vercel ([4abd1d1](https://github.com/ndsrf/wedding/commit/4abd1d1bf30e5f7ba93ff6fda7d9f3826eba92d4))
* **api:** add missing wedding_day_invitation_template_id to planner wedding response objects ([8b8b86f](https://github.com/ndsrf/wedding/commit/8b8b86f1aa3f1f9b45a35c30a1ffbd1b941b5105))
* cast Buffer to BodyInit for fetch body in google-photos client ([86b8a9d](https://github.com/ndsrf/wedding/commit/86b8a9d4e66e02644a71e87168ea4bdd9343b958))
* create new migration to apply locations and itinerary schema ([262a816](https://github.com/ndsrf/wedding/commit/262a816b78fc4977354c8604fb9a3153b531dd99))
* datetime-local format for itinerary on mobile ([1ddbddd](https://github.com/ndsrf/wedding/commit/1ddbddd579079069de4905afc14e3244a384fbd5))
* **deps:** replace es-shims polyfill packages with local stubs via npm workspaces ([52ad5ea](https://github.com/ndsrf/wedding/commit/52ad5ea857b3a01985564a88b3b016081252c959))
* **deps:** upgrade jest to v30 and add test-exclude override to eliminate blocked packages ([ee54920](https://github.com/ndsrf/wedding/commit/ee54920b1b4fad949648b3e1cdf77069a2aaba23))
* **e2e:** update create-wedding test for new location select field ([0ddbc90](https://github.com/ndsrf/wedding/commit/0ddbc908601c41d19354c684151e665c40d11540))
* **gallery:** confirm Google Photos URLs on upload; refresh in admin gallery ([0bf43f2](https://github.com/ndsrf/wedding/commit/0bf43f2b0c7d093af5c58fd24d204db6adebba31))
* **google-photos:** make album creation non-fatal in OAuth callback ([02555f9](https://github.com/ndsrf/wedding/commit/02555f978ee2d764996c9118fb75f7448336c2f1))
* hoist gPhotos declaration to fix 'Cannot find name' compile error ([fecb0d6](https://github.com/ndsrf/wedding/commit/fecb0d61edb49d0b96eafef4821fafe5d2a90ef5))
* more fixes to track AI replies in the notifications screen ([6588a93](https://github.com/ndsrf/wedding/commit/6588a93547060d783d3eea969e01df6d1dac0b45))
* move event type from Location to ItineraryItem; fix location dropdown ([1540e67](https://github.com/ndsrf/wedding/commit/1540e6782fd7908eed366689ca373f65b6da90fd))
* remove unused remaining var in migrate route; update Google Photos README ([90cf139](https://github.com/ndsrf/wedding/commit/90cf13918f3cf57f2d4afa0a5cd8499fd29f7370))
* rename unused request param in gallery DELETE handler ([7b4ef1c](https://github.com/ndsrf/wedding/commit/7b4ef1c4eb3c495fae769f68f9117ea64dbe5765))
* render gallery blocks on invitation page and fix hardcoded Spanish tab ([5b8a10e](https://github.com/ndsrf/wedding/commit/5b8a10e69185b31f1e29037df19e9b01577dd251))
* resolve all build errors for Next.js 15 compilation ([b46e155](https://github.com/ndsrf/wedding/commit/b46e15591ec7bc0135d78dc8cd07cb2afa84d9ee))
* resolve ESLint compilation errors in gallery components ([551f5f2](https://github.com/ndsrf/wedding/commit/551f5f2a2bc72fd3cb0871142f50618ae9d6742e))
* rewrite migration as idempotent SQL; revert Dockerfile ([ba4e3ee](https://github.com/ndsrf/wedding/commit/ba4e3ee16553c3c11ce7311bcbd4d698224805fd))
* run prisma migrate deploy on container startup ([8a1fcde](https://github.com/ndsrf/wedding/commit/8a1fcde77ee7a979eea1164ec9e82be079a91e6d))
* **security:** override https-proxy-agent to v7 to eliminate agent-base@6.0.2 ([ff46d04](https://github.com/ndsrf/wedding/commit/ff46d04d102c88dbaad8b71251b10609ebdd9249))
* **security:** resolve Hono vulnerability GHSA-gq3j-xvxp-8hrf ([8d8c622](https://github.com/ndsrf/wedding/commit/8d8c6223b8a0eab32f7fd0dee4d84af076abc1b6))
* **security:** update hono to 4.12.2 to patch GHSA-xh87-mx6m-69f3 ([e3c57d7](https://github.com/ndsrf/wedding/commit/e3c57d750e64652ddbe5e9adb034de29972ac73f))
* show error to user when Google Photos connection fails ([e846c78](https://github.com/ndsrf/wedding/commit/e846c7810dcb32eb0c8646dca23c26e49b09b255))
* strip trailing slash from APP_URL to prevent redirect_uri_mismatch ([fdc5b9e](https://github.com/ndsrf/wedding/commit/fdc5b9ee39528359665be41b60b5e05d25876152))
* **tests:** add google_photos fields to baseWedding fixture ([b32f62e](https://github.com/ndsrf/wedding/commit/b32f62e6f5b0591979198df920f7fba43d7b0215))
* **tests:** add missing wedding_day_invitation_template_id to test fixture and Wedding interface ([1153567](https://github.com/ndsrf/wedding/commit/1153567fd39737265ad3a91e7e26d443b0587ace))
* **test:** update jest --testPathPattern to --testPathPatterns for jest v30 ([87ed501](https://github.com/ndsrf/wedding/commit/87ed50155ed9402e523faad24d4492f67d7ddd35))
* Timeline for AI messages ([c6e2e45](https://github.com/ndsrf/wedding/commit/c6e2e455f9779e4c1ddddcd6eb2c1380efc05474))
* **ui:** restore PrivateHeader and reprioritise dashboard actions ([b1c06d0](https://github.com/ndsrf/wedding/commit/b1c06d03ecea5439cd7917c887d3148be92dc415))
* Update wedding assistant prompt for RSVP handling to include magic link ([d41b1a1](https://github.com/ndsrf/wedding/commit/d41b1a1621f80b8af7e1cb371933916a45d947bb))
* **webhooks:** resolve AI reply tracking failures due to database timeouts ([ad89705](https://github.com/ndsrf/wedding/commit/ad897051234ba3a34958f6da503b995826cedf0e))
* wedding edit form and admin itinerary display ([48b7a45](https://github.com/ndsrf/wedding/commit/48b7a457d370be2b3175ebc3f50a1e05617fac6d))


### Features

* Add AI auto-reply functionality for WhatsApp messages ([1b94bfa](https://github.com/ndsrf/wedding/commit/1b94bfa0f8b71830494b9774045a3fc0914eb82a))
* add i18n translations for itinerary feature ([1a1dbf7](https://github.com/ndsrf/wedding/commit/1a1dbf70124bc773c5c0cfe5d76af4d256544f32))
* add itinerary display to wedding detail page ([c17adcf](https://github.com/ndsrf/wedding/commit/c17adcf962de1966b62a8fe118ad9fb54a8fd2c8))
* add ItineraryTimeline component with horizontal step layout ([96de5a4](https://github.com/ndsrf/wedding/commit/96de5a474bbe81619e4b488dcb65d33a17b05816))
* add location management, itinerary, and Google Maps support ([3cbed25](https://github.com/ndsrf/wedding/commit/3cbed257d573af128aee80bf3140dfe9cc38bfc1))
* add public /w/[code] wedding landing page with guest lookup ([3d5732e](https://github.com/ndsrf/wedding/commit/3d5732eff5b050faf0b8c5c629375e892475a6a0))
* add wedding photo gallery with Google Photos integration ([9fb0b97](https://github.com/ndsrf/wedding/commit/9fb0b97656f062c5897ee9c17ea1ce7eae60483d))
* **ai:** use short URLs in AI replies and prevent WhatsApp prefetch tracking ([3cd49ed](https://github.com/ndsrf/wedding/commit/3cd49ed72f9b30b867bb848ded0483a99bbcdb62))
* complete i18n for itinerary and main event location ([0dabf59](https://github.com/ndsrf/wedding/commit/0dabf598790d941c777a581d617ea6dbf5ea28e4))
* Enhance /admin homepage, and add NupciBot ([302c2cd](https://github.com/ndsrf/wedding/commit/302c2cdee17cd1e57c4d1381a40380f0759c6b66))
* **google-photos:** remove OAuth backend, add paste-link API + migration ([e93d330](https://github.com/ndsrf/wedding/commit/e93d330227522cb610d90cce5ac9bdfd6d36ec1f))
* **google-photos:** replace OAuth flow with manual album link paste ([5c11312](https://github.com/ndsrf/wedding/commit/5c113121b3baf63887548b697a4b9c0e86e3eb6d))
* **google-photos:** restore OAuth upload with appendonly scope + migration + pagination ([68dc073](https://github.com/ndsrf/wedding/commit/68dc073289838a156a775dc48b60d2009f8c8897))
* include active invitation template text blocks in AI system prompt ([13a785f](https://github.com/ndsrf/wedding/commit/13a785f4a42dd4521704055ae5144f350196123a))
* Notification bell ([e9bb84e](https://github.com/ndsrf/wedding/commit/e9bb84e57225c85885155b1fbabd63e587925ea5))
* NupciBot with doc context and link to wedding in RSVP ([447449f](https://github.com/ndsrf/wedding/commit/447449f2b0d45ee0f932be5564a2aa5b9eb3aa47))
* redesign Google Photos connected state UI ([af03d05](https://github.com/ndsrf/wedding/commit/af03d05f4bec6ec5c472b374d8a07ff3f63366f0))
* sort itinerary items by date and time ([ae17d4c](https://github.com/ndsrf/wedding/commit/ae17d4cb5c0a7959e456f890667e61436b77ec15))
* upload WhatsApp and web photos to Google Photos via temp blob storage ([e1b9a5f](https://github.com/ndsrf/wedding/commit/e1b9a5fcaf33366055a498b0173a39269d6db42f))
* **w-page:** add header, language bar, footer; refactor phone prefix logic ([b650f22](https://github.com/ndsrf/wedding/commit/b650f22d35cf632197c2aa13f0fb0b98f65110f5))
* **w-page:** split phone/email into separate fields with prefix dropdown ([390d3ad](https://github.com/ndsrf/wedding/commit/390d3ad9f420479e03f096b72e9c6dcbc0c9f307))


### Reverts

* remove prisma migrate deploy from build script ([0460e4b](https://github.com/ndsrf/wedding/commit/0460e4b4814832ce8c4ce12807e42f9d41ce339e))



# [1.1.0](https://github.com/ndsrf/wedding/compare/v1.0.0...v1.1.0) (2026-03-01)


### Bug Fixes

* add missing id field to WeddingData type and setWeddingData call ([57e30e9](https://github.com/ndsrf/wedding/commit/57e30e987b1114b6caca8374969231b86cbef1b6))
* add missing main_event_location_id field to test fixture ([53b94eb](https://github.com/ndsrf/wedding/commit/53b94ebc37f7d2be8ecdd359aeca2ceea1d21847))
* add missing planner reminders and save-the-date API routes ([44f4846](https://github.com/ndsrf/wedding/commit/44f484607305eec721a1d3d695f8a41c989ca088))
* add prisma migrate deploy to build script for Vercel ([4abd1d1](https://github.com/ndsrf/wedding/commit/4abd1d1bf30e5f7ba93ff6fda7d9f3826eba92d4))
* **api:** add missing wedding_day_invitation_template_id to planner wedding response objects ([8b8b86f](https://github.com/ndsrf/wedding/commit/8b8b86f1aa3f1f9b45a35c30a1ffbd1b941b5105))
* cast Buffer to BodyInit for fetch body in google-photos client ([86b8a9d](https://github.com/ndsrf/wedding/commit/86b8a9d4e66e02644a71e87168ea4bdd9343b958))
* create new migration to apply locations and itinerary schema ([262a816](https://github.com/ndsrf/wedding/commit/262a816b78fc4977354c8604fb9a3153b531dd99))
* datetime-local format for itinerary on mobile ([1ddbddd](https://github.com/ndsrf/wedding/commit/1ddbddd579079069de4905afc14e3244a384fbd5))
* **deps:** replace es-shims polyfill packages with local stubs via npm workspaces ([52ad5ea](https://github.com/ndsrf/wedding/commit/52ad5ea857b3a01985564a88b3b016081252c959))
* **deps:** upgrade jest to v30 and add test-exclude override to eliminate blocked packages ([ee54920](https://github.com/ndsrf/wedding/commit/ee54920b1b4fad949648b3e1cdf77069a2aaba23))
* **e2e:** update create-wedding test for new location select field ([0ddbc90](https://github.com/ndsrf/wedding/commit/0ddbc908601c41d19354c684151e665c40d11540))
* **gallery:** confirm Google Photos URLs on upload; refresh in admin gallery ([0bf43f2](https://github.com/ndsrf/wedding/commit/0bf43f2b0c7d093af5c58fd24d204db6adebba31))
* **google-photos:** make album creation non-fatal in OAuth callback ([02555f9](https://github.com/ndsrf/wedding/commit/02555f978ee2d764996c9118fb75f7448336c2f1))
* hoist gPhotos declaration to fix 'Cannot find name' compile error ([fecb0d6](https://github.com/ndsrf/wedding/commit/fecb0d61edb49d0b96eafef4821fafe5d2a90ef5))
* more fixes to track AI replies in the notifications screen ([6588a93](https://github.com/ndsrf/wedding/commit/6588a93547060d783d3eea969e01df6d1dac0b45))
* move event type from Location to ItineraryItem; fix location dropdown ([1540e67](https://github.com/ndsrf/wedding/commit/1540e6782fd7908eed366689ca373f65b6da90fd))
* remove unused remaining var in migrate route; update Google Photos README ([90cf139](https://github.com/ndsrf/wedding/commit/90cf13918f3cf57f2d4afa0a5cd8499fd29f7370))
* rename unused request param in gallery DELETE handler ([7b4ef1c](https://github.com/ndsrf/wedding/commit/7b4ef1c4eb3c495fae769f68f9117ea64dbe5765))
* render gallery blocks on invitation page and fix hardcoded Spanish tab ([5b8a10e](https://github.com/ndsrf/wedding/commit/5b8a10e69185b31f1e29037df19e9b01577dd251))
* resolve all build errors for Next.js 15 compilation ([b46e155](https://github.com/ndsrf/wedding/commit/b46e15591ec7bc0135d78dc8cd07cb2afa84d9ee))
* resolve ESLint compilation errors in gallery components ([551f5f2](https://github.com/ndsrf/wedding/commit/551f5f2a2bc72fd3cb0871142f50618ae9d6742e))
* rewrite migration as idempotent SQL; revert Dockerfile ([ba4e3ee](https://github.com/ndsrf/wedding/commit/ba4e3ee16553c3c11ce7311bcbd4d698224805fd))
* run prisma migrate deploy on container startup ([8a1fcde](https://github.com/ndsrf/wedding/commit/8a1fcde77ee7a979eea1164ec9e82be079a91e6d))
* **security:** override https-proxy-agent to v7 to eliminate agent-base@6.0.2 ([ff46d04](https://github.com/ndsrf/wedding/commit/ff46d04d102c88dbaad8b71251b10609ebdd9249))
* **security:** resolve Hono vulnerability GHSA-gq3j-xvxp-8hrf ([8d8c622](https://github.com/ndsrf/wedding/commit/8d8c6223b8a0eab32f7fd0dee4d84af076abc1b6))
* **security:** update hono to 4.12.2 to patch GHSA-xh87-mx6m-69f3 ([e3c57d7](https://github.com/ndsrf/wedding/commit/e3c57d750e64652ddbe5e9adb034de29972ac73f))
* show error to user when Google Photos connection fails ([e846c78](https://github.com/ndsrf/wedding/commit/e846c7810dcb32eb0c8646dca23c26e49b09b255))
* strip trailing slash from APP_URL to prevent redirect_uri_mismatch ([fdc5b9e](https://github.com/ndsrf/wedding/commit/fdc5b9ee39528359665be41b60b5e05d25876152))
* **tests:** add google_photos fields to baseWedding fixture ([b32f62e](https://github.com/ndsrf/wedding/commit/b32f62e6f5b0591979198df920f7fba43d7b0215))
* **tests:** add missing wedding_day_invitation_template_id to test fixture and Wedding interface ([1153567](https://github.com/ndsrf/wedding/commit/1153567fd39737265ad3a91e7e26d443b0587ace))
* **test:** update jest --testPathPattern to --testPathPatterns for jest v30 ([87ed501](https://github.com/ndsrf/wedding/commit/87ed50155ed9402e523faad24d4492f67d7ddd35))
* Timeline for AI messages ([c6e2e45](https://github.com/ndsrf/wedding/commit/c6e2e455f9779e4c1ddddcd6eb2c1380efc05474))
* **ui:** restore PrivateHeader and reprioritise dashboard actions ([b1c06d0](https://github.com/ndsrf/wedding/commit/b1c06d03ecea5439cd7917c887d3148be92dc415))
* Update wedding assistant prompt for RSVP handling to include magic link ([d41b1a1](https://github.com/ndsrf/wedding/commit/d41b1a1621f80b8af7e1cb371933916a45d947bb))
* **webhooks:** resolve AI reply tracking failures due to database timeouts ([ad89705](https://github.com/ndsrf/wedding/commit/ad897051234ba3a34958f6da503b995826cedf0e))
* wedding edit form and admin itinerary display ([48b7a45](https://github.com/ndsrf/wedding/commit/48b7a457d370be2b3175ebc3f50a1e05617fac6d))


### Features

* Add AI auto-reply functionality for WhatsApp messages ([1b94bfa](https://github.com/ndsrf/wedding/commit/1b94bfa0f8b71830494b9774045a3fc0914eb82a))
* add i18n translations for itinerary feature ([1a1dbf7](https://github.com/ndsrf/wedding/commit/1a1dbf70124bc773c5c0cfe5d76af4d256544f32))
* add itinerary display to wedding detail page ([c17adcf](https://github.com/ndsrf/wedding/commit/c17adcf962de1966b62a8fe118ad9fb54a8fd2c8))
* add ItineraryTimeline component with horizontal step layout ([96de5a4](https://github.com/ndsrf/wedding/commit/96de5a474bbe81619e4b488dcb65d33a17b05816))
* add location management, itinerary, and Google Maps support ([3cbed25](https://github.com/ndsrf/wedding/commit/3cbed257d573af128aee80bf3140dfe9cc38bfc1))
* add public /w/[code] wedding landing page with guest lookup ([3d5732e](https://github.com/ndsrf/wedding/commit/3d5732eff5b050faf0b8c5c629375e892475a6a0))
* add wedding photo gallery with Google Photos integration ([9fb0b97](https://github.com/ndsrf/wedding/commit/9fb0b97656f062c5897ee9c17ea1ce7eae60483d))
* **ai:** use short URLs in AI replies and prevent WhatsApp prefetch tracking ([3cd49ed](https://github.com/ndsrf/wedding/commit/3cd49ed72f9b30b867bb848ded0483a99bbcdb62))
* complete i18n for itinerary and main event location ([0dabf59](https://github.com/ndsrf/wedding/commit/0dabf598790d941c777a581d617ea6dbf5ea28e4))
* Enhance /admin homepage, and add NupciBot ([302c2cd](https://github.com/ndsrf/wedding/commit/302c2cdee17cd1e57c4d1381a40380f0759c6b66))
* **google-photos:** remove OAuth backend, add paste-link API + migration ([e93d330](https://github.com/ndsrf/wedding/commit/e93d330227522cb610d90cce5ac9bdfd6d36ec1f))
* **google-photos:** replace OAuth flow with manual album link paste ([5c11312](https://github.com/ndsrf/wedding/commit/5c113121b3baf63887548b697a4b9c0e86e3eb6d))
* **google-photos:** restore OAuth upload with appendonly scope + migration + pagination ([68dc073](https://github.com/ndsrf/wedding/commit/68dc073289838a156a775dc48b60d2009f8c8897))
* include active invitation template text blocks in AI system prompt ([13a785f](https://github.com/ndsrf/wedding/commit/13a785f4a42dd4521704055ae5144f350196123a))
* Notification bell ([e9bb84e](https://github.com/ndsrf/wedding/commit/e9bb84e57225c85885155b1fbabd63e587925ea5))
* redesign Google Photos connected state UI ([af03d05](https://github.com/ndsrf/wedding/commit/af03d05f4bec6ec5c472b374d8a07ff3f63366f0))
* sort itinerary items by date and time ([ae17d4c](https://github.com/ndsrf/wedding/commit/ae17d4cb5c0a7959e456f890667e61436b77ec15))
* upload WhatsApp and web photos to Google Photos via temp blob storage ([e1b9a5f](https://github.com/ndsrf/wedding/commit/e1b9a5fcaf33366055a498b0173a39269d6db42f))
* **w-page:** add header, language bar, footer; refactor phone prefix logic ([b650f22](https://github.com/ndsrf/wedding/commit/b650f22d35cf632197c2aa13f0fb0b98f65110f5))
* **w-page:** split phone/email into separate fields with prefix dropdown ([390d3ad](https://github.com/ndsrf/wedding/commit/390d3ad9f420479e03f096b72e9c6dcbc0c9f307))


### Reverts

* remove prisma migrate deploy from build script ([0460e4b](https://github.com/ndsrf/wedding/commit/0460e4b4814832ce8c4ce12807e42f9d41ce339e))



# 1.1.0 (2026-02-19)


### Bug Fixes

* add missing main_event_location_id field to test fixture ([53b94eb](http://127.0.0.1:26798/git/ndsrf/wedding/commits/53b94ebc37f7d2be8ecdd359aeca2ceea1d21847))
* add missing planner reminders and save-the-date API routes ([44f4846](http://127.0.0.1:26798/git/ndsrf/wedding/commits/44f484607305eec721a1d3d695f8a41c989ca088))
* add prisma migrate deploy to build script for Vercel ([4abd1d1](http://127.0.0.1:26798/git/ndsrf/wedding/commits/4abd1d1bf30e5f7ba93ff6fda7d9f3826eba92d4))
* correct magic_token field name and document undici vulnerability ([fc5f06d](http://127.0.0.1:26798/git/ndsrf/wedding/commits/fc5f06d77db3a4d45e60569ba8dc8967d8213778))
* Correct return type of toAbsoluteUrl to string | undefined ([ba8542e](http://127.0.0.1:26798/git/ndsrf/wedding/commits/ba8542ef3f963eaf1194b6e4fb7f2bb179abb7f8))
* Cosmetic issues ([a9a8470](http://127.0.0.1:26798/git/ndsrf/wedding/commits/a9a8470f9f9e66977fd17657dbf37b85e3bdfc4a))
* create new migration to apply locations and itinerary schema ([262a816](http://127.0.0.1:26798/git/ndsrf/wedding/commits/262a816b78fc4977354c8604fb9a3153b531dd99))
* datetime-local format for itinerary on mobile ([1ddbddd](http://127.0.0.1:26798/git/ndsrf/wedding/commits/1ddbddd579079069de4905afc14e3244a384fbd5))
* **e2e:** update create-wedding test for new location select field ([0ddbc90](http://127.0.0.1:26798/git/ndsrf/wedding/commits/0ddbc908601c41d19354c684151e665c40d11540))
* enable pre render invalidation when wedding template changes ([355bf34](http://127.0.0.1:26798/git/ndsrf/wedding/commits/355bf3422a3353d6abe54474841fba2b5a55aaf6))
* Facebook login button was not appearing on the sign-in screen even when the facebook oauth details were entered in the .env file ([46bdfb9](http://127.0.0.1:26798/git/ndsrf/wedding/commits/46bdfb94b30a5c8e8e8385f05bf60503eca48b57))
* Handle absolute URLs in Vercel Blob storage for invitation images ([90ff906](http://127.0.0.1:26798/git/ndsrf/wedding/commits/90ff906a79157df6a8dcf06113f12afb9afbcb07))
* improve revalidation error handling and fix test assertions ([d8c32dd](http://127.0.0.1:26798/git/ndsrf/wedding/commits/d8c32dd418ff68e58c0e161f1f04614d60cc3f4f))
* Include themes in migration scripts ([5809607](http://127.0.0.1:26798/git/ndsrf/wedding/commits/5809607dd446ea5e13465f702de26276389bb5b5))
* more fixes to track AI replies in the notifications screen ([6588a93](http://127.0.0.1:26798/git/ndsrf/wedding/commits/6588a93547060d783d3eea969e01df6d1dac0b45))
* move event type from Location to ItineraryItem; fix location dropdown ([1540e67](http://127.0.0.1:26798/git/ndsrf/wedding/commits/1540e6782fd7908eed366689ca373f65b6da90fd))
* rewrite migration as idempotent SQL; revert Dockerfile ([ba4e3ee](http://127.0.0.1:26798/git/ndsrf/wedding/commits/ba4e3ee16553c3c11ce7311bcbd4d698224805fd))
* run prisma migrate deploy on container startup ([8a1fcde](http://127.0.0.1:26798/git/ndsrf/wedding/commits/8a1fcde77ee7a979eea1164ec9e82be079a91e6d))
* Timeline for AI messages ([c6e2e45](http://127.0.0.1:26798/git/ndsrf/wedding/commits/c6e2e455f9779e4c1ddddcd6eb2c1380efc05474))
* translations issues ([0f279f5](http://127.0.0.1:26798/git/ndsrf/wedding/commits/0f279f5b9896190224b5f3f2a7e333a048bce88b))
* Update wedding assistant prompt for RSVP handling to include magic link ([d41b1a1](http://127.0.0.1:26798/git/ndsrf/wedding/commits/d41b1a1621f80b8af7e1cb371933916a45d947bb))
* wedding edit form and admin itinerary display ([48b7a45](http://127.0.0.1:26798/git/ndsrf/wedding/commits/48b7a457d370be2b3175ebc3f50a1e05617fac6d))


### Features

* Add AI auto-reply functionality for WhatsApp messages ([1b94bfa](http://127.0.0.1:26798/git/ndsrf/wedding/commits/1b94bfa0f8b71830494b9774045a3fc0914eb82a))
* add i18n translations for itinerary feature ([1a1dbf7](http://127.0.0.1:26798/git/ndsrf/wedding/commits/1a1dbf70124bc773c5c0cfe5d76af4d256544f32))
* add itinerary display to wedding detail page ([c17adcf](http://127.0.0.1:26798/git/ndsrf/wedding/commits/c17adcf962de1966b62a8fe118ad9fb54a8fd2c8))
* add ItineraryTimeline component with horizontal step layout ([96de5a4](http://127.0.0.1:26798/git/ndsrf/wedding/commits/96de5a474bbe81619e4b488dcb65d33a17b05816))
* add location management, itinerary, and Google Maps support ([3cbed25](http://127.0.0.1:26798/git/ndsrf/wedding/commits/3cbed257d573af128aee80bf3140dfe9cc38bfc1))
* add template screen for planners ([9543898](http://127.0.0.1:26798/git/ndsrf/wedding/commits/954389869651cb1cfe2ca8faa396d35680051fcc))
* Add Vercel blob storage support ([776a77b](http://127.0.0.1:26798/git/ndsrf/wedding/commits/776a77b9af36526b41a69580d79a582492278a90))
* Add vercel speed insights ([064284c](http://127.0.0.1:26798/git/ndsrf/wedding/commits/064284c551e6604dbd75dc97253ae8ad9d0636ba))
* Add vercel speed insights + Vercel DB instructions ([b730aff](http://127.0.0.1:26798/git/ndsrf/wedding/commits/b730aff21a90df80b80e25ce0a7411afdde6e779))
* checklist editable for existing weddings ([e51191f](http://127.0.0.1:26798/git/ndsrf/wedding/commits/e51191fa76486e93397c811ad4ef35dc07c19985))
* complete i18n for itinerary and main event location ([0dabf59](http://127.0.0.1:26798/git/ndsrf/wedding/commits/0dabf598790d941c777a581d617ea6dbf5ea28e4))
* cookie consent ([5152e61](http://127.0.0.1:26798/git/ndsrf/wedding/commits/5152e61f6ff956c8729fe4edd0da681111f2f415))
* implement ISR with on-demand revalidation for RSVP pages ([a91c286](http://127.0.0.1:26798/git/ndsrf/wedding/commits/a91c2863d49ef0c30d70c66095e66d0e5ccb711f))
* invitation build improvements ([3bc7d89](http://127.0.0.1:26798/git/ndsrf/wedding/commits/3bc7d890a5ebac4f5f502af713025109946a3a15))
* invitation builder improvements ([6e40de0](http://127.0.0.1:26798/git/ndsrf/wedding/commits/6e40de03db27b28d148ddb8a24a2d4a1fe35ff4c))
* invitation builder: rich text editor for text blocks ([0f5156c](http://127.0.0.1:26798/git/ndsrf/wedding/commits/0f5156c0503e7b9c7a7cb3f24315866454220e58))
* planner screens to edit weddings ([3b6ee02](http://127.0.0.1:26798/git/ndsrf/wedding/commits/3b6ee029998b231aeb1ef778be3b6583dfe49d0e))
* rsvp pre-render to speed up rsvp generation ([85835ea](http://127.0.0.1:26798/git/ndsrf/wedding/commits/85835ea6a3489a294fef092df9ccd3df92aae63a))
* sort itinerary items by date and time ([ae17d4c](http://127.0.0.1:26798/git/ndsrf/wedding/commits/ae17d4cb5c0a7959e456f890667e61436b77ec15))
* Template editor for wedding planner to set defaults for all their weddings ([b6ceaed](http://127.0.0.1:26798/git/ndsrf/wedding/commits/b6ceaede56717a5b44792c5ce473b9ad5b1d10e3))


### Reverts

* remove prisma migrate deploy from build script ([0460e4b](http://127.0.0.1:26798/git/ndsrf/wedding/commits/0460e4b4814832ce8c4ce12807e42f9d41ce339e))



# [1.0.0](https://github.com/ndsrf/wedding/compare/v0.10.0...v1.0.0) (2026-02-13)


### Bug Fixes

* correct magic_token field name and document undici vulnerability ([fc5f06d](https://github.com/ndsrf/wedding/commit/fc5f06d77db3a4d45e60569ba8dc8967d8213778))
* Correct return type of toAbsoluteUrl to string | undefined ([ba8542e](https://github.com/ndsrf/wedding/commit/ba8542ef3f963eaf1194b6e4fb7f2bb179abb7f8))
* enable pre render invalidation when wedding template changes ([355bf34](https://github.com/ndsrf/wedding/commit/355bf3422a3353d6abe54474841fba2b5a55aaf6))
* Facebook login button was not appearing on the sign-in screen even when the facebook oauth details were entered in the .env file ([46bdfb9](https://github.com/ndsrf/wedding/commit/46bdfb94b30a5c8e8e8385f05bf60503eca48b57))
* Handle absolute URLs in Vercel Blob storage for invitation images ([90ff906](https://github.com/ndsrf/wedding/commit/90ff906a79157df6a8dcf06113f12afb9afbcb07))
* improve revalidation error handling and fix test assertions ([d8c32dd](https://github.com/ndsrf/wedding/commit/d8c32dd418ff68e58c0e161f1f04614d60cc3f4f))
* Include themes in migration scripts ([5809607](https://github.com/ndsrf/wedding/commit/5809607dd446ea5e13465f702de26276389bb5b5))
* translations issues ([0f279f5](https://github.com/ndsrf/wedding/commit/0f279f5b9896190224b5f3f2a7e333a048bce88b))


### Features

* add template screen for planners ([9543898](https://github.com/ndsrf/wedding/commit/954389869651cb1cfe2ca8faa396d35680051fcc))
* Add Vercel blob storage support ([776a77b](https://github.com/ndsrf/wedding/commit/776a77b9af36526b41a69580d79a582492278a90))
* checklist editable for existing weddings ([e51191f](https://github.com/ndsrf/wedding/commit/e51191fa76486e93397c811ad4ef35dc07c19985))
* cookie consent ([5152e61](https://github.com/ndsrf/wedding/commit/5152e61f6ff956c8729fe4edd0da681111f2f415))
* implement ISR with on-demand revalidation for RSVP pages ([a91c286](https://github.com/ndsrf/wedding/commit/a91c2863d49ef0c30d70c66095e66d0e5ccb711f))
* planner screens to edit weddings ([3b6ee02](https://github.com/ndsrf/wedding/commit/3b6ee029998b231aeb1ef778be3b6583dfe49d0e))
* rsvp pre-render to speed up rsvp generation ([85835ea](https://github.com/ndsrf/wedding/commit/85835ea6a3489a294fef092df9ccd3df92aae63a))
* Template editor for wedding planner to set defaults for all their weddings ([b6ceaed](https://github.com/ndsrf/wedding/commit/b6ceaede56717a5b44792c5ce473b9ad5b1d10e3))



# [0.10.0](https://github.com/ndsrf/wedding/compare/v0.9.1...v0.10.0) (2026-02-10)


### Bug Fixes

* Cosmetic issues ([a9a8470](https://github.com/ndsrf/wedding/commit/a9a8470f9f9e66977fd17657dbf37b85e3bdfc4a))
* enable proper markdown rendering in news section ([2a62638](https://github.com/ndsrf/wedding/commit/2a62638364c772b762413945509d39ee2d762e1f))
* enhance Facebook login integration and improve development environment settings for Windows WSL ([01a292c](https://github.com/ndsrf/wedding/commit/01a292c3b196caea188043b72e02d1cf20fa4e5e))
* improve mobile readability with better text contrast ([599fe01](https://github.com/ndsrf/wedding/commit/599fe0130ccf2cc4eb8407e22a2cd00cb4e990e5))
* update sign-out and sign-in behavior to include redirect option ([7bd1009](https://github.com/ndsrf/wedding/commit/7bd1009d1b374bf538b7e1c07e85aaa643b8239d))


### Features

* add news to public website ([aff3297](https://github.com/ndsrf/wedding/commit/aff3297f1d58825e292200ad95ad21edf3e3c833))
* Add vercel speed insights ([064284c](https://github.com/ndsrf/wedding/commit/064284c551e6604dbd75dc97253ae8ad9d0636ba))
* Add vercel speed insights + Vercel DB instructions ([b730aff](https://github.com/ndsrf/wedding/commit/b730aff21a90df80b80e25ce0a7411afdde6e779))
* improvements to the guest list page ([6d482ea](https://github.com/ndsrf/wedding/commit/6d482ea9692c150885c617d40b34fa5c71bf3479))
* invitation build improvements ([3bc7d89](https://github.com/ndsrf/wedding/commit/3bc7d890a5ebac4f5f502af713025109946a3a15))
* invitation builder improvements ([6e40de0](https://github.com/ndsrf/wedding/commit/6e40de03db27b28d148ddb8a24a2d4a1fe35ff4c))
* invitation builder: rich text editor for text blocks ([0f5156c](https://github.com/ndsrf/wedding/commit/0f5156c0503e7b9c7a7cb3f24315866454220e58))
* reduced guest list view on mobile phones ([49d6674](https://github.com/ndsrf/wedding/commit/49d66745a1b27b15b5da5bbf1dfa83f80799e659))



## [0.9.1](https://github.com/ndsrf/wedding/compare/v0.9.0...v0.9.1) (2026-02-08)


### Bug Fixes

* Fix unit test, due to new field on Excel template (channel) ([55b89c1](https://github.com/ndsrf/wedding/commit/55b89c1b8dd0ab8c68f60ff2420a9fc03f74364d))



# [0.9.0](https://github.com/ndsrf/wedding/compare/v0.8.3...v0.9.0) (2026-02-08)


### Bug Fixes

* enhance logging configuration and update middleware routes ([d70aef8](https://github.com/ndsrf/wedding/commit/d70aef8d927e275cd5a3fa7d1cc9ce199df24fb3))
* improve email service configuration in contact route ([c0ddcad](https://github.com/ndsrf/wedding/commit/c0ddcad70d5772b7b86e80aab50d5bc80437d405))
* improve locale validation and error handling across pages ([f18f084](https://github.com/ndsrf/wedding/commit/f18f0842f97dfdfb989230116e8c2a33ec875994))


### Features

* add reports feature with multi-language support ([da6652d](https://github.com/ndsrf/wedding/commit/da6652dcaed1cc05f9fcca19c3c1da049e9fcb1c))
* General landing page ([e692aea](https://github.com/ndsrf/wedding/commit/e692aead6f403df3ba61b3db1fce1f870bbbbd24))
* implement bulk actions for guest management ([d1da3e9](https://github.com/ndsrf/wedding/commit/d1da3e9b7d9c806d3047654d8ce918360b76bfbe))
* refactor middleware and update routing for internationalization and short URL handling ([d20171f](https://github.com/ndsrf/wedding/commit/d20171fc0f0b421f4276d6fbcc5c6a91ff6127b3))
* remove apple auth ([992fcef](https://github.com/ndsrf/wedding/commit/992fcefcd7941a6589d7f5171511c42c7631f558))
* SEO optiomisation ([cd90b8d](https://github.com/ndsrf/wedding/commit/cd90b8df4982d81bcfa9fc38d0e219f0fea794d7))
* update email sender name to support dynamic wedding name ([1c0a20a](https://github.com/ndsrf/wedding/commit/1c0a20ae8751ce673bfdbb0d2cf46d403a9b22aa))



## [0.8.3](https://github.com/ndsrf/wedding/compare/v0.8.2...v0.8.3) (2026-02-06)


### Features

* enhance invitation builder with countdown and template settings ([50ec269](https://github.com/ndsrf/wedding/commit/50ec2690da1c86d0979d78f8e6ed3040d7c1978a))
* enhance invitation template editor with paper background support ([a875156](https://github.com/ndsrf/wedding/commit/a875156d00bb1f4fa0584cb0fd6d1985576d23d9))



## [0.8.2](https://github.com/ndsrf/wedding/compare/v0.8.1...v0.8.2) (2026-02-06)



## [0.8.1](https://github.com/ndsrf/wedding/compare/v0.8.0...v0.8.1) (2026-02-06)


### Features

* add 270 unit tests for most complex areas & npm test command to settings.local.json ([62b1d17](https://github.com/ndsrf/wedding/commit/62b1d178194890455ef624039775729f0742da0b))
* enhance platform optimization and security configurations ([9de9cf4](https://github.com/ndsrf/wedding/commit/9de9cf4afcd723d91a474d1c99272321c6fb8ff2))



# [0.8.0](https://github.com/ndsrf/wedding/compare/v0.7.1...v0.8.0) (2026-02-06)


### Features

* general performance improvements ([a4bf9e3](https://github.com/ndsrf/wedding/commit/a4bf9e3dbcc2d0006dff5bfe546497a3b66b012a))



## [0.7.1](https://github.com/ndsrf/wedding/compare/v0.7.0...v0.7.1) (2026-02-05)


### Performance Improvements

* optimize SQL queries and convert tracking events to fire-and-forget ([a6eda0e](https://github.com/ndsrf/wedding/commit/a6eda0ebd485327ed158809edd6d34afc735b829))



# [0.7.0](https://github.com/ndsrf/wedding/compare/v0.6.0...v0.7.0) (2026-02-05)


### Bug Fixes

* Add E2E environment variables to Playwright webServer ([839c181](https://github.com/ndsrf/wedding/commit/839c181c464f3ca7b7fdc5128621b1ebd6b2143a))
* add translations missing ([38c4033](https://github.com/ndsrf/wedding/commit/38c40330a9f7d2686264570f369b91623e1f6b40))
* Add type assertion for metadata template_name to fix TypeScript error ([4978528](https://github.com/ndsrf/wedding/commit/4978528bc3b5957b296c49b561beeacec60470b6))
* Add TypeScript type definitions for Save the Date feature ([88b7de8](https://github.com/ndsrf/wedding/commit/88b7de834e8602b840b2e1d385b23f92d746b51d))
* Change Jest test environment from jsdom to node ([c5f2c70](https://github.com/ndsrf/wedding/commit/c5f2c70ef33a1e6b83864527f8e6c16ef02bf826))
* Correct API endpoint URL for guest timeline ([296e1b2](https://github.com/ndsrf/wedding/commit/296e1b24216e74f2725c11219006d44df3bac277))
* Correct AuthProvider enum values and remove unused import ([2bf830c](https://github.com/ndsrf/wedding/commit/2bf830c76806ba16a58aa645018bcd408d8fafc2))
* Correct TypeScript errors in test files ([fb70107](https://github.com/ndsrf/wedding/commit/fb701076b5f20f28ae33e999b6b67713f96dd46e))
* Create playwright/.auth directory before saving auth state ([2a0c094](https://github.com/ndsrf/wedding/commit/2a0c094029c6186a7819ee7c045fb386dcd2e0b8))
* disable E2E tests and artifact upload due to GitHub Actions bug ([63fc7f1](https://github.com/ndsrf/wedding/commit/63fc7f1e8cbf81b7869d4259853775ca948902d2))
* **e2e:** add E2E bypass form to signin page and improve auth setup stability ([0be578b](https://github.com/ndsrf/wedding/commit/0be578be62d375ab2ab28958a87dd99e712fb177))
* **e2e:** add MASTER_ADMIN_EMAILS environment variable for E2E tests ([bf8979d](https://github.com/ndsrf/wedding/commit/bf8979d0e6bd0f367c7b41f633be2e1e8f304f57))
* **e2e:** enhance test reliability for Guest Management and validation errors ([6cffa2c](https://github.com/ndsrf/wedding/commit/6cffa2c2f51f348f18f53ff193778e5cc0d52157))
* **e2e:** Fix automated test issues with invitedBy ([07fcfe9](https://github.com/ndsrf/wedding/commit/07fcfe94cdf857b32736eea3d3114e74f5108ce1))
* **e2e:** fix automated tests ([76797a0](https://github.com/ndsrf/wedding/commit/76797a06c42ad7299dd4dc9319c68e13b2db8260))
* **e2e:** improve test robustness and add debugging for auth/page loading issues ([ec3fd3b](https://github.com/ndsrf/wedding/commit/ec3fd3b08e362b5e556687754080b3e4799419ea))
* **e2e:** replace ts-node with tsx for db setup scripts ([446e26e](https://github.com/ndsrf/wedding/commit/446e26ef20011093dbddc04a63a81896bb315fc0))
* **e2e:** resolve auth setup failures and missing translations ([bae1105](https://github.com/ndsrf/wedding/commit/bae1105d4c86bbb6afe3b21398551875cd5a0a4a))
* **e2e:** update testDir for setup projects in playwright config ([f1f65fc](https://github.com/ndsrf/wedding/commit/f1f65fc42924d5fbe39a6cc0a4cf63941abddb69))
* enhance GuestFormModal accessibility and update e2e tests ([b161b18](https://github.com/ndsrf/wedding/commit/b161b18586c9d05cf458832337d56995254a6193))
* Explicitly pass environment variables to Playwright webServer ([762b239](https://github.com/ndsrf/wedding/commit/762b23907bdcf1b7234fb7a080281e190973e90f))
* Extract template_name with proper type guard to fix ReactNode error ([ca485f7](https://github.com/ndsrf/wedding/commit/ca485f70d87d0c73e18eacdcd805f7b4f226ce70))
* Improve CI artifact handling for E2E tests ([cfd5721](https://github.com/ndsrf/wedding/commit/cfd57214ecf881f45d2708d961cff2c0118c0701))
* Inherit all parent env vars in Playwright webServer ([27ab4ca](https://github.com/ndsrf/wedding/commit/27ab4ca916c4a90ac387b3504b428c021740bd16))
* issues with the save the date functionality ([5cca989](https://github.com/ndsrf/wedding/commit/5cca9894fd5fbc214d0286dccfa44fd7b84aa445))
* Let Playwright webServer handle server startup in CI ([5284ece](https://github.com/ndsrf/wedding/commit/5284ece16235016214fadb4b5c3d47ed0419c44e))
* Let webServer inherit environment variables from parent process ([b61680a](https://github.com/ndsrf/wedding/commit/b61680a202da062c65d78a6f16b63b8d365d2706))
* **lint:** replace <a> with <Link> in master admin pages ([2c42803](https://github.com/ndsrf/wedding/commit/2c4280323361573c4b54eb7b0d8a43356af54537))
* Make coverage thresholds non-blocking for unit and integration tests ([a6960c5](https://github.com/ndsrf/wedding/commit/a6960c5d8c0d211b43483fe74243513d60292e35))
* migration issues ([1ce1322](https://github.com/ndsrf/wedding/commit/1ce1322791685ce862887352a512810733d57d08))
* payments page family dropdown ([a1fcbb5](https://github.com/ndsrf/wedding/commit/a1fcbb58843d7d26b09cb7f3de1dacfee36db605))
* properly type locale parameter in formatDateByLanguage call ([e705811](https://github.com/ndsrf/wedding/commit/e70581163f9ac26dc5ec327fa8dd2575335823f9))
* reduce build artifact size by excluding cache and standalone dirs ([7df89d4](https://github.com/ndsrf/wedding/commit/7df89d4c53371332061f957d7091dd554168023d))
* Remove fallback messages from CI test steps and add E2E env vars ([0c34738](https://github.com/ndsrf/wedding/commit/0c3473899cbff8036f1a3e854a79cf05c47eec4d))
* remove unnecessary type assertion from locale parameter ([b902ce6](https://github.com/ndsrf/wedding/commit/b902ce68a137c950bdc5c049a1ef597532625109))
* resolve Prisma schema relation conflict for invitation templates ([dde3aac](https://github.com/ndsrf/wedding/commit/dde3aac0ff4110297c3faffa7666e687a36e14f2))
* Resolve TypeScript compilation errors in timeline feature ([dd16ba3](https://github.com/ndsrf/wedding/commit/dd16ba3091347f9b24a00cb59df33510003a2b58))
* set DOCKER_API_VERSION to resolve "client version too old" error in docker-compose ([60faa37](https://github.com/ndsrf/wedding/commit/60faa37e7a8ad82ed50d4cfd6da9cb8dc6bc1c7f))
* Start Next.js server for E2E tests in CI ([839c97f](https://github.com/ndsrf/wedding/commit/839c97f55a378819e173b7b5c5a6228a323020cd))
* sync database schema with Prisma after adding invitation templates ([d4c7da7](https://github.com/ndsrf/wedding/commit/d4c7da72b8a51e9061a7b8dd7bdcf2f7a5b25c89))
* **types:** use Language and PaymentMode enums in CachedWeddingPageData ([89cadfa](https://github.com/ndsrf/wedding/commit/89cadfa497144b50dfce366b20d160e83435d725))
* Update GuestTimelineModal to handle API response structure ([1c5cfa3](https://github.com/ndsrf/wedding/commit/1c5cfa32a7391e6402c9781544a99ffd6148754c))
* update input styles for better accessibility ([fd9a3d6](https://github.com/ndsrf/wedding/commit/fd9a3d6c821d29ca7ddde8c14dfd77b6352af480))
* update preferred language for wedding admin in seed data ([a4c4065](https://github.com/ndsrf/wedding/commit/a4c4065c768df33a7c7713e7e198b97094e8c7a9))
* update RSVP default to attending ([8707da1](https://github.com/ndsrf/wedding/commit/8707da12930b1c57ba706edd1a455b69f52f1bf5))
* Use dev server for E2E tests in CI ([0624091](https://github.com/ndsrf/wedding/commit/0624091e43b9e182ddc925f23927f322e00014b8))
* use tar archive for build artifacts upload ([e7cbb71](https://github.com/ndsrf/wedding/commit/e7cbb71b9427460346e4031b814869b041d11db0))


### Features

* add Alex Brush font and text decoration controls (bold, italic, underline) ([ba1517a](https://github.com/ndsrf/wedding/commit/ba1517ac3507cb37f3d06e05e10b929fdc4678fa))
* Add comprehensive test suite covering unit, UI, API, and integration tests ([3a4c3be](https://github.com/ndsrf/wedding/commit/3a4c3be4f9e6b99f6bca51ce337aaa10b93e88e2))
* Add confirmation template to admin templates page and fix mobile styling ([75a52fe](https://github.com/ndsrf/wedding/commit/75a52fe219dd5ae45d31ec2c5e4cb9b42be53fdb))
* Add French, German, and Italian translations for timeline feature ([3b26467](https://github.com/ndsrf/wedding/commit/3b26467f847f2fcffb896e0d0aa575cf3a47719d))
* Add guest timeline and notification navigation features ([058a8d0](https://github.com/ndsrf/wedding/commit/058a8d0c73c6cefb7b16d8c85f30b11999d2ed81))
* add in-memory cache for per-wedding RSVP page data ([74f5f7f](https://github.com/ndsrf/wedding/commit/74f5f7f50fdace3f1ed3e4da16c1c5aa128d2ed1))
* add preferred contact method for guests in GuestTable component ([0da004a](https://github.com/ndsrf/wedding/commit/0da004aa881b1a2a43e98fe175047b1e646bf768))
* Add Save the Date functionality to wedding planner ([edbf1a1](https://github.com/ndsrf/wedding/commit/edbf1a120cb866afeb0227c985537084821d5001))
* add WhatsApp Content Template ID support ([24240ee](https://github.com/ndsrf/wedding/commit/24240ee90f1f5a054fcf45295798ec7febf3b500))
* Add whatsapp messaging via Links instead of whatsapp business ([912d3cb](https://github.com/ndsrf/wedding/commit/912d3cb223d8ae72797ce9a865c0a392e647a600))
* configurable cache TTL, fire-and-forget tracking, lite token validation ([92dbb29](https://github.com/ndsrf/wedding/commit/92dbb2966c92eb1b08ef99d80835d076f1c8ca7c))
* **e2e:** add RSVP cutoff date input to wedding creation flow ([ffc41b7](https://github.com/ndsrf/wedding/commit/ffc41b7e1dca9b123836ae0e66b125f2325e47dd))
* enhance date formatting and language support across components ([73e6a80](https://github.com/ndsrf/wedding/commit/73e6a8042aee30706e52124fdd5fb2d7000b2b17))
* enhance invitation builder blocks with customizable styling and layout changes ([603eb95](https://github.com/ndsrf/wedding/commit/603eb958c6c03bcdff3b964033e5890e4a809bc1))
* enhance InvitationTemplateEditor with customizable styles for location and countdown blocks ([3eefb11](https://github.com/ndsrf/wedding/commit/3eefb11f8a17839cbe7fad86abac0a2d6092cc73))
* Enhance testing setup and configuration ([64cbbeb](https://github.com/ndsrf/wedding/commit/64cbbeb5ae2c5e37582fdcfca78e61d73e4d18e9))
* Invited by functionality for guests ([fd030fc](https://github.com/ndsrf/wedding/commit/fd030fc5460a49bcef64d7d458e25da0aaea325a))
* save the date added to the template editor (if save the date enabled for the wedding) ([13dacea](https://github.com/ndsrf/wedding/commit/13daceafce881559d8ff514400af09499305fe47))
* shorten magic-link URLs to /{INITIALS}/{CODE} ([13b368f](https://github.com/ndsrf/wedding/commit/13b368f8ccb7757131e821d43206ab330078502e))
* update localization for gifts ([e6f94cd](https://github.com/ndsrf/wedding/commit/e6f94cd5c3cc42a3c5575ee6c38aa6f9145f43f7))



# [0.6.0](https://github.com/ndsrf/wedding/compare/v0.5.1...v0.6.0) (2026-01-30)


### Bug Fixes

* Ensure family names are prominently displayed in validation warning ([f335ae0](https://github.com/ndsrf/wedding/commit/f335ae0a16c47796eaf5d180850047869e7e0e80))
* location and time not appearing on the invites rvsp - now fixed ([7667d3d](https://github.com/ndsrf/wedding/commit/7667d3df0679a81f8e300a65fc25616617916fa4))
* Use actual sent_count from API response in success notification ([dec0d77](https://github.com/ndsrf/wedding/commit/dec0d77572b38fa539c5c22233f53069234d5dbb))


### Features

* Add attachments to payments (for providers) ([7f09715](https://github.com/ndsrf/wedding/commit/7f0971501b5af0408fc08c696c90d4660c66ea59))
* Add Twilio integration for SMS and WhatsApp messaging ([58a3542](https://github.com/ndsrf/wedding/commit/58a354289fef4c3107e623f8d223b30464715356))
* Implement Guest Preferred Channel with pre-send validation ([31bb57f](https://github.com/ndsrf/wedding/commit/31bb57f14cff6816b63ca645161a34afb12c0597))



## [0.5.1](https://github.com/ndsrf/wedding/compare/v0.5.0...v0.5.1) (2026-01-28)



# [0.5.0](https://github.com/ndsrf/wedding/compare/v0.4.0...v0.5.0) (2026-01-28)


### Bug Fixes

* add DATABASE_URL build arg to Dockerfile for Prisma 7 ([1e4479f](https://github.com/ndsrf/wedding/commit/1e4479fbd0c7f10f4ddfb9519de2dd356579d658))
* add DATABASE_URL to all GitHub Actions workflows for Prisma 7 ([43ad9a4](https://github.com/ndsrf/wedding/commit/43ad9a427c1bd24537a30853be0212181446e1f9))
* add DATABASE_URL to builder stage for Next.js build ([feeffbb](https://github.com/ndsrf/wedding/commit/feeffbbe9a17b28e57accd4fc47b6abdc28043bc))
* add PostgreSQL adapter for Prisma 7 client initialization ([e054107](https://github.com/ndsrf/wedding/commit/e054107ef8f1de376ff4b46929a489cb02392a19))
* compilation issue, I committed too quickly ([f8179a2](https://github.com/ndsrf/wedding/commit/f8179a2d62bf1cb50453d32403019d7c621dd073))
* copy node_modules/.bin to Docker runner for prisma CLI ([130005e](https://github.com/ndsrf/wedding/commit/130005ec3a57145c3e5c6259daab39e29e5a1650))
* copy prisma CLI package to Docker runner stage ([08b6e22](https://github.com/ndsrf/wedding/commit/08b6e2269396e065de0be44ec35ec5e2207545c1))
* enhance image upload and processing for templates ([547ae4c](https://github.com/ndsrf/wedding/commit/547ae4c8e09baf030c9f111d6e8632d5f7973d2c))
* install Prisma CLI in runner stage with all dependencies ([2a80b65](https://github.com/ndsrf/wedding/commit/2a80b650ecd341faec491d9c6be266a15a0a959a))
* issues with uploaded images in emails ([561d3d1](https://github.com/ndsrf/wedding/commit/561d3d1b038753b72f9bd553fb7092b4f50754d7))
* logging and cookie settings to fix auth issues in production - deployed with cloudflare zero does not work ([a24dfca](https://github.com/ndsrf/wedding/commit/a24dfca67edbd7095f10f6d86221ac9c0bd1cf6f))
* more docker google auth issues ([967dd7b](https://github.com/ndsrf/wedding/commit/967dd7bf9151625ed94ab36dffa75369fe9fe689))
* remove dotenv import from prisma.config.ts for Docker compatibility ([ff660c7](https://github.com/ndsrf/wedding/commit/ff660c7c2a227e417dccda001b90bbef46c4a743))
* troubleshooting image upload in production ([a9c8d10](https://github.com/ndsrf/wedding/commit/a9c8d10b6b7099b2a44a7b7bbe1c7f66dc02c654))
* trying to fix auth issues in production ([4035735](https://github.com/ndsrf/wedding/commit/40357351e736eb746af394e6c7da46471aebec89))


### Features

* add image upload functionality to admin template page ([eae7a92](https://github.com/ndsrf/wedding/commit/eae7a92311d675bbd2efc751b6b66fd0a7c200e5))
* include wedding admins in wedding details response and update admin management UI ([ee54e45](https://github.com/ndsrf/wedding/commit/ee54e4548e3f60fc65535c6529014cc135e898f3))
* mobile friendly changes ([59c7408](https://github.com/ndsrf/wedding/commit/59c74083ca4405d65196f19c48d94817a6b9317b))
* upgrade to Prisma 7 for Docker compatibility ([41a78d9](https://github.com/ndsrf/wedding/commit/41a78d998d088c5c9c67ae0dcafe4fcc5d5b45d7))



# [0.4.0](https://github.com/ndsrf/wedding/compare/v0.3.0...v0.4.0) (2026-01-26)


### Features

* add API endpoint for manual database seeding ([6620ebc](https://github.com/ndsrf/wedding/commit/6620ebc5f8538d2ae18992f70439ba35f545ccf7))
* add empty confirmation message for RSVP form in multiple languages ([9cd7be3](https://github.com/ndsrf/wedding/commit/9cd7be3394383718a7d222e971379f72ef0169bd))
* add Garden Birds RSVP template with envelope reveal animation ([e871ac9](https://github.com/ndsrf/wedding/commit/e871ac900b992b65150f6ad612cdc5a5efe847b7))
* add instrumentation hook and update theme presets ([a6f4899](https://github.com/ndsrf/wedding/commit/a6f48999a15c69c24c900ed57057a2318a6720d7))
* add multi-language support to Garden Birds template ([39228d9](https://github.com/ndsrf/wedding/commit/39228d9bd0ccf42d2499575fb92b554280810e47))
* add scrollable sections to Garden Birds template ([973dc2c](https://github.com/ndsrf/wedding/commit/973dc2c4128363cfe8c3c6ee01262467c6e8a04c)), closes [#FAF9F5](https://github.com/ndsrf/wedding/issues/FAF9F5) [#8B9B7](https://github.com/ndsrf/wedding/issues/8B9B7) [#7A8B6](https://github.com/ndsrf/wedding/issues/7A8B6) [#F5F1E8](https://github.com/ndsrf/wedding/issues/F5F1E8) [#FAF9F5](https://github.com/ndsrf/wedding/issues/FAF9F5)
* add theme selection and gift IBAN input to wedding configuration ([43ad2c9](https://github.com/ndsrf/wedding/commit/43ad2c96304fe26f76bca9ce5b80b0171e56dfd4))
* enhance EnvelopeReveal component with improved date handling and Google Maps integration ([86c70d8](https://github.com/ndsrf/wedding/commit/86c70d8eec44eb452a6288df9d289f92d0d9ece3))
* enhance Garden Birds template with elegant hero section ([18658ac](https://github.com/ndsrf/wedding/commit/18658ac1d9c7693b1fe828c3dcd768624d3ddc5b))
* update Docker configuration and enhance deployment documentation ([81e1741](https://github.com/ndsrf/wedding/commit/81e1741e72f9bffd1f51b12f05726cc8fd0cce1b))



# [0.3.0](https://github.com/ndsrf/wedding/compare/v0.2.0...v0.3.0) (2026-01-23)


### Bug Fixes

* solve merge issues with migrations ([6ccf770](https://github.com/ndsrf/wedding/commit/6ccf77053775add02cb3eb8efce9f7ee3d966e4b))


### Features

* add gift IBAN feature for wedding gifts ([4960ef6](https://github.com/ndsrf/wedding/commit/4960ef6d843cccfbae473e80cfe083b454de0a50))
* add message templates and wedding status management features ([8e9bc35](https://github.com/ndsrf/wedding/commit/8e9bc35c4de446b823120fab82b17a7386e32eab))
* add upcoming tasks localization and widget integration ([4cdce97](https://github.com/ndsrf/wedding/commit/4cdce9773f6aab6e5600bdf8c545dc645a574650))
* implement checklist management features ([492a983](https://github.com/ndsrf/wedding/commit/492a9833770399030dbad4a2a6606cf94cb39abc))
* implement seating plan management features ([0cd29b9](https://github.com/ndsrf/wedding/commit/0cd29b980a7843fbe9619da9549efe35cd4e5d42))
* providers and payments ([b684db0](https://github.com/ndsrf/wedding/commit/b684db0cd8f4ae0745a2045586af3eb694466fd2))



# 0.2.0 (2026-01-20)


### Bug Fixes

* **i18n:** add missing auth translation keys to all locales ([3563be8](https://github.com/ndsrf/wedding/commit/3563be8f97280dddfe77f1436fec38ff1de88879))


### Features

* extra fields for RVSP & edit guests ([24a7906](https://github.com/ndsrf/wedding/commit/24a7906c83bcdd67e66ea7e883b66bf390328a55))



# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with Next.js 14+ and TypeScript
- Multi-tenant wedding management platform
- OAuth authentication (Google, Facebook, Apple)
- Magic link authentication for guests
- Multi-language support (ES, EN, FR, IT, DE)
- Theme system with 5 pre-built themes
- Excel import/export for guest management
- CI/CD pipelines with GitHub Actions
- Docker deployment configuration

### Security
- Multi-tenancy isolation
- CSRF protection with OAuth state parameter
- Secure magic link tokens using crypto.randomUUID()
