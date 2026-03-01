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
