# [0.6.0-beta.12](https://github.com/BYKHD/ui-syncup/compare/v0.6.0-beta.11...v0.6.0-beta.12) (2026-03-30)


### Bug Fixes

* remove overflow-hidden and justify-center styles from setup screen and wizard container ([9f27e89](https://github.com/BYKHD/ui-syncup/commit/9f27e89764d16f2d4a50dc5f72e24eab29d58998))
* update release workflow to trigger on PR merge and improve concurrency handling [skip ci] ([0457dbd](https://github.com/BYKHD/ui-syncup/commit/0457dbd68186597a25554e0a28688c03c9ccaa75))

# [0.6.0-beta.11](https://github.com/BYKHD/ui-syncup/compare/v0.6.0-beta.10...v0.6.0-beta.11) (2026-03-29)


### Bug Fixes

* minor bug fix ([#110](https://github.com/BYKHD/ui-syncup/issues/110)) ([3171dfc](https://github.com/BYKHD/ui-syncup/commit/3171dfc81bc72b091c9cbf880dd5430462ffd9eb)), closes [#101](https://github.com/BYKHD/ui-syncup/issues/101) [#104](https://github.com/BYKHD/ui-syncup/issues/104) [#106](https://github.com/BYKHD/ui-syncup/issues/106) [#108](https://github.com/BYKHD/ui-syncup/issues/108) [#109](https://github.com/BYKHD/ui-syncup/issues/109)
* Minor Bug Fix ([#111](https://github.com/BYKHD/ui-syncup/issues/111)) ([2dd20ba](https://github.com/BYKHD/ui-syncup/commit/2dd20baf83a710233698298f9707fc9d791b0c7b)), closes [#101](https://github.com/BYKHD/ui-syncup/issues/101) [#104](https://github.com/BYKHD/ui-syncup/issues/104) [#106](https://github.com/BYKHD/ui-syncup/issues/106) [#108](https://github.com/BYKHD/ui-syncup/issues/108) [#109](https://github.com/BYKHD/ui-syncup/issues/109)

# [0.6.0-beta.10](https://github.com/BYKHD/ui-syncup/compare/v0.6.0-beta.9...v0.6.0-beta.10) (2026-03-29)


### Bug Fixes

* minor bug fix ([6d055ba](https://github.com/BYKHD/ui-syncup/commit/6d055ba9b725b21acda51c0fadd402676871989c))

# [0.6.0-beta.9](https://github.com/BYKHD/ui-syncup/compare/v0.6.0-beta.8...v0.6.0-beta.9) (2026-03-29)


### Bug Fixes

* add migrationHash to migrate.property.test.ts callback parameters ([fc656ad](https://github.com/BYKHD/ui-syncup/commit/fc656ad0abd07bd3a5e4585502281b5f6bce013c))
* reset password redirect ([df7633d](https://github.com/BYKHD/ui-syncup/commit/df7633dc034068d60555b555effff330180c62e0))

# [0.6.0-beta.8](https://github.com/BYKHD/ui-syncup/compare/v0.6.0-beta.7...v0.6.0-beta.8) (2026-03-27)


### Bug Fixes

* **lint:** resolve no-explicit-any, unescaped-entities, and set-state-in-effect warnings ([d2c40c3](https://github.com/BYKHD/ui-syncup/commit/d2c40c3bfabeffb7d48d8252a3f87e3bfa850407))


### Features

* **api:** add SSE stream endpoint for push notifications ([8c29e9b](https://github.com/BYKHD/ui-syncup/commit/8c29e9bfef9f35b72d0ab31509c7303dd3f63dcf))
* change to single bucket storage ([#107](https://github.com/BYKHD/ui-syncup/issues/107)) ([e663cbb](https://github.com/BYKHD/ui-syncup/commit/e663cbb05bc04f3d1c46704e93612dab5518f439)), closes [#101](https://github.com/BYKHD/ui-syncup/issues/101) [#104](https://github.com/BYKHD/ui-syncup/issues/104) [#106](https://github.com/BYKHD/ui-syncup/issues/106) [#108](https://github.com/BYKHD/ui-syncup/issues/108) [#109](https://github.com/BYKHD/ui-syncup/issues/109)
* **db:** add pg_notify trigger on notifications INSERT ([823591b](https://github.com/BYKHD/ui-syncup/commit/823591bf940e5cede48e82e4691ac037c4fafd0f))
* **dev:** add test notification button and dev-only API endpoint ([e34ffe3](https://github.com/BYKHD/ui-syncup/commit/e34ffe3970e5c320c7bc76f0a1f8ab18055a0a0a))
* **env:** add optional REDIS_URL to env schema ([592301d](https://github.com/BYKHD/ui-syncup/commit/592301d9d35b1dc467c9d31f3a8194a8ae8dc290))
* **infra:** add lazy Redis pub/sub client singletons ([3424c71](https://github.com/BYKHD/ui-syncup/commit/3424c71853673f86febeb3d1bb94bb47e971ba8e))
* **infra:** add PostgreSQL LISTEN singleton with Redis fan-out ([a00ac1f](https://github.com/BYKHD/ui-syncup/commit/a00ac1f4bcc85763c625941ff172d5782a30d8ae))
* **notifications:** replace Supabase Realtime with EventSource SSE ([0384807](https://github.com/BYKHD/ui-syncup/commit/038480791e055d655819ba71b4792e85757ffed7))

# [0.6.0-beta.7](https://github.com/BYKHD/ui-syncup/compare/v0.6.0-beta.6...v0.6.0-beta.7) (2026-03-26)


### Bug Fixes

* Implement server-side proxy uploads for media and attachments, replacing direct-to-S3 presigned URL uploads. ([#108](https://github.com/BYKHD/ui-syncup/issues/108)) ([f1d2cc9](https://github.com/BYKHD/ui-syncup/commit/f1d2cc94fdab5185bf1241342e7d1eb331ac5a35))
* use `BETTER_AUTH_URL` for runtime app URL resolution. ([37234e2](https://github.com/BYKHD/ui-syncup/commit/37234e25ebac2608776cbe155cd30244625cc986))

# [0.6.0-beta.6](https://github.com/BYKHD/ui-syncup/compare/v0.6.0-beta.5...v0.6.0-beta.6) (2026-03-25)


### Bug Fixes

* Implement dynamic auth client baseURL based on environment. ([e9f4400](https://github.com/BYKHD/ui-syncup/commit/e9f44008335bb66ec822f6c5a9f667901fe89a17))

# [0.6.0-beta.5](https://github.com/BYKHD/ui-syncup/compare/v0.6.0-beta.4...v0.6.0-beta.5) (2026-03-25)


### Features

* refactor storage to use a single bucket ([#106](https://github.com/BYKHD/ui-syncup/issues/106)) ([c41cb2c](https://github.com/BYKHD/ui-syncup/commit/c41cb2c5d623ba5f86414fe2cb2f7f6d79e6d7cf))

# [0.6.0-beta.4](https://github.com/BYKHD/ui-syncup/compare/v0.6.0-beta.3...v0.6.0-beta.4) (2026-03-25)


### Reverts

* Revert "fix: Compile the database migration script into a self-contained binary, removing `bun` and `node_modules` from the production image and updating execution commands." ([377f81f](https://github.com/BYKHD/ui-syncup/commit/377f81f7d90b04b31ab1745594c685006bf3f101))

# [0.6.0-beta.1](https://github.com/BYKHD/ui-syncup/compare/v0.5.0...v0.6.0-beta.1) (2026-03-25)


### Bug Fixes

* fix onboarding and acc creation  ([#101](https://github.com/BYKHD/ui-syncup/issues/101)) ([aac4535](https://github.com/BYKHD/ui-syncup/commit/aac453503abb009a27421d3e78bf641caedae2f0))
* update active team retrieval in settings pages to use direct Drizzle queries. ([8d650f5](https://github.com/BYKHD/ui-syncup/commit/8d650f546fff0a968ae230cea811dbbd33247d9a))


### Features

* Migrate team context management to user session and introduce slug-based routing for team settings. ([d261ccd](https://github.com/BYKHD/ui-syncup/commit/d261ccdef619dd7640999d673f4ce70049db0885))
* refactor role retrieval to prioritize dedicated member tables. ([6bf5703](https://github.com/BYKHD/ui-syncup/commit/6bf57038be260e4c2214e279ebb0c349b17248e2))

# [0.5.0](https://github.com/BYKHD/ui-syncup/compare/v0.4.1...v0.5.0) (2026-03-25)


### Features

* Migrate team context management to user session ([#105](https://github.com/BYKHD/ui-syncup/issues/105)) ([bd31b15](https://github.com/BYKHD/ui-syncup/commit/bd31b1529cd09b17c3bde8c6122d9f5c2f4d1f77)), closes [#101](https://github.com/BYKHD/ui-syncup/issues/101) [#104](https://github.com/BYKHD/ui-syncup/issues/104)

# [0.5.0-beta.2](https://github.com/BYKHD/ui-syncup/compare/v0.5.0-beta.1...v0.5.0-beta.2) (2026-03-25)


### Features

* Migrate team context management to user session and introduce slug-based routing for team settings. ([d261ccd](https://github.com/BYKHD/ui-syncup/commit/d261ccdef619dd7640999d673f4ce70049db0885))

# [0.5.0-beta.1](https://github.com/BYKHD/ui-syncup/compare/v0.4.1-beta.2...v0.5.0-beta.1) (2026-03-24)


### Features

* refactor role retrieval to prioritize dedicated member tables. ([6bf5703](https://github.com/BYKHD/ui-syncup/commit/6bf57038be260e4c2214e279ebb0c349b17248e2))

## [0.4.1-beta.2](https://github.com/BYKHD/ui-syncup/compare/v0.4.1-beta.1...v0.4.1-beta.2) (2026-03-24)


### Bug Fixes

* fix onboarding and acc creation  ([#101](https://github.com/BYKHD/ui-syncup/issues/101)) ([#102](https://github.com/BYKHD/ui-syncup/issues/102)) ([ebba01e](https://github.com/BYKHD/ui-syncup/commit/ebba01e6db0308285b631d2bffc6978383d224ab))

## [0.4.1-beta.1](https://github.com/BYKHD/ui-syncup/compare/v0.4.0...v0.4.1-beta.1) (2026-03-24)


### Bug Fixes

* fix onboarding and acc creation  ([#101](https://github.com/BYKHD/ui-syncup/issues/101)) ([aac4535](https://github.com/BYKHD/ui-syncup/commit/aac453503abb009a27421d3e78bf641caedae2f0))

# [0.4.0](https://github.com/BYKHD/ui-syncup/compare/v0.3.14...v0.4.0) (2026-03-24)


### Bug Fixes

* always use relative URLs in browser to fix Dokploy/self-hosted setup ([#98](https://github.com/BYKHD/ui-syncup/issues/98)) ([ac47727](https://github.com/BYKHD/ui-syncup/commit/ac477274689d9802ba8cc8d5f5031834da0d3e3b))
* build relative API URLs in browser when base URL is undefined. ([#97](https://github.com/BYKHD/ui-syncup/issues/97)) ([a75dc75](https://github.com/BYKHD/ui-syncup/commit/a75dc75ebc587ed8662f75e712077cfc410928ea))
* dokploy setup api n gzta ([#100](https://github.com/BYKHD/ui-syncup/issues/100)) ([a11b29e](https://github.com/BYKHD/ui-syncup/commit/a11b29e9e10c3574f3e0ecd95e6072e9c7e1ebe7))
* Improve setup error detection for missing tables and clarify the corresponding UI message. ([#95](https://github.com/BYKHD/ui-syncup/issues/95)) ([1c0280f](https://github.com/BYKHD/ui-syncup/commit/1c0280f576f8e0fd685a67a69913ec6607b92858))
* release stable ([56d1e38](https://github.com/BYKHD/ui-syncup/commit/56d1e388f11a630ad70eabd5baaf213f88dcecf2))
* Remove manual changelog update instructions from versioning guide. ([d9cf394](https://github.com/BYKHD/ui-syncup/commit/d9cf3949c9c4a6700a40c0a85b4c06759bde96db))
* rename CLI package to ui-syncup-cli, add shebang banner, guard CI against skip-ci commits ([3e9ef29](https://github.com/BYKHD/ui-syncup/commit/3e9ef2970eae274752a5ed74eb9b88d424d60233))
* rewrite storage health check to use shared S3 clients ([#92](https://github.com/BYKHD/ui-syncup/issues/92)) ([6598d7f](https://github.com/BYKHD/ui-syncup/commit/6598d7f431607c4a3e869fc42e0cb1a3f379e529))
* skip CI pipeline on semantic-release back-commits ([418cdbb](https://github.com/BYKHD/ui-syncup/commit/418cdbb1e1b293bfb2adeb223c36d40b38f30868))
* stop publishing root Next.js app to npm, rename CLI package, fix shebang, guard skip-ci ([e7a6c43](https://github.com/BYKHD/ui-syncup/commit/e7a6c4365d7add42ba787094a3f98c589ad355cf))
* trigger release ([a55c60c](https://github.com/BYKHD/ui-syncup/commit/a55c60c0a7f5ccf9c8a7c60c7742774d11ea3a4e))
* trigger release ([e8a2c22](https://github.com/BYKHD/ui-syncup/commit/e8a2c226a72061f0b402eeec836330d83b1cf53f))
* update from develop ([#96](https://github.com/BYKHD/ui-syncup/issues/96)) ([726a71f](https://github.com/BYKHD/ui-syncup/commit/726a71ff1712cc78bffd2c0569470ffa691f7a5a))
* update image version comment to include `:beta` pre-release option ([142181b](https://github.com/BYKHD/ui-syncup/commit/142181b693dc26ddd398732f929f3140ac9720c1))


### Features

* Add a plan for a health check page and implement automated database migrations for local development. ([#90](https://github.com/BYKHD/ui-syncup/issues/90)) ([b527e54](https://github.com/BYKHD/ui-syncup/commit/b527e54c054b71268e2774913163d81c4036bea1))
* add standalone /health page ([#87](https://github.com/BYKHD/ui-syncup/issues/87)) ([81dbe4e](https://github.com/BYKHD/ui-syncup/commit/81dbe4e97ccb5a7883e085f5b100d69618cb0b6f))
* Configure semantic-release for automated versioning with beta support from `develop` and temporarily disable the setup page redirect. ([6f00c0e](https://github.com/BYKHD/ui-syncup/commit/6f00c0e2a4a5134a5dd37b8c4e842deacf268da7))
* Enable setup completion check and redirect to sign-in page. ([8b28b90](https://github.com/BYKHD/ui-syncup/commit/8b28b9007598fd8288290b9707872608c1f52923))
* health check page before setup ([#93](https://github.com/BYKHD/ui-syncup/issues/93)) ([3ad1b7c](https://github.com/BYKHD/ui-syncup/commit/3ad1b7c3d66945ced5d25601f7a2b11cc47bdb93))
* implement admin setup wizard and overhaul docker orchestration ([5495c10](https://github.com/BYKHD/ui-syncup/commit/5495c10a329b97ca7030f52dd5bccab44960ab67))
* Separate Docker image builds into dedicated workflows for pre-release and stable versions. ([c28d1ad](https://github.com/BYKHD/ui-syncup/commit/c28d1adda4f584a067b202d35448fa4d1766a389))
* Upgrade PostgreSQL to v17, refine database SSL connection logic, and ensure email worker state persists across HMR. ([#91](https://github.com/BYKHD/ui-syncup/issues/91)) ([ca2112d](https://github.com/BYKHD/ui-syncup/commit/ca2112dc28b774e62a2994e8a8441b6e64dead16))

# [0.4.0-beta.18](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.17...v0.4.0-beta.18) (2026-03-24)


### Bug Fixes

* dokploy setup api n gzta ([#100](https://github.com/BYKHD/ui-syncup/issues/100)) ([a11b29e](https://github.com/BYKHD/ui-syncup/commit/a11b29e9e10c3574f3e0ecd95e6072e9c7e1ebe7))

# [0.4.0-beta.17](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.16...v0.4.0-beta.17) (2026-03-24)


### Bug Fixes

* update from develop ([#96](https://github.com/BYKHD/ui-syncup/issues/96)) ([726a71f](https://github.com/BYKHD/ui-syncup/commit/726a71ff1712cc78bffd2c0569470ffa691f7a5a))

# [0.4.0-beta.16](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.15...v0.4.0-beta.16) (2026-03-23)


### Bug Fixes

* always use relative URLs in browser to fix Dokploy/self-hosted setup ([#98](https://github.com/BYKHD/ui-syncup/issues/98)) ([ac47727](https://github.com/BYKHD/ui-syncup/commit/ac477274689d9802ba8cc8d5f5031834da0d3e3b))

# [0.4.0-beta.15](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.14...v0.4.0-beta.15) (2026-03-23)


### Bug Fixes

* build relative API URLs in browser when base URL is undefined. ([#97](https://github.com/BYKHD/ui-syncup/issues/97)) ([a75dc75](https://github.com/BYKHD/ui-syncup/commit/a75dc75ebc587ed8662f75e712077cfc410928ea))

# [0.4.0-beta.14](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.13...v0.4.0-beta.14) (2026-03-23)


### Features

* health check page before setup ([#93](https://github.com/BYKHD/ui-syncup/issues/93)) ([3ad1b7c](https://github.com/BYKHD/ui-syncup/commit/3ad1b7c3d66945ced5d25601f7a2b11cc47bdb93))

# [0.4.0-beta.13](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.12...v0.4.0-beta.13) (2026-03-23)


### Bug Fixes

* Improve setup error detection for missing tables and clarify the corresponding UI message. ([#95](https://github.com/BYKHD/ui-syncup/issues/95)) ([1c0280f](https://github.com/BYKHD/ui-syncup/commit/1c0280f576f8e0fd685a67a69913ec6607b92858))

# [0.4.0-beta.12](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.11...v0.4.0-beta.12) (2026-03-23)


### Bug Fixes

* rewrite storage health check to use shared S3 clients ([#92](https://github.com/BYKHD/ui-syncup/issues/92)) ([6598d7f](https://github.com/BYKHD/ui-syncup/commit/6598d7f431607c4a3e869fc42e0cb1a3f379e529))

# [0.4.0-beta.11](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.10...v0.4.0-beta.11) (2026-03-23)


### Features

* implement admin setup wizard and overhaul docker orchestration ([5495c10](https://github.com/BYKHD/ui-syncup/commit/5495c10a329b97ca7030f52dd5bccab44960ab67))

# [0.4.0-beta.10](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.9...v0.4.0-beta.10) (2026-03-23)


### Features

* Upgrade PostgreSQL to v17, refine database SSL connection logic, and ensure email worker state persists across HMR. ([#91](https://github.com/BYKHD/ui-syncup/issues/91)) ([ca2112d](https://github.com/BYKHD/ui-syncup/commit/ca2112dc28b774e62a2994e8a8441b6e64dead16))

# [0.4.0-beta.9](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.8...v0.4.0-beta.9) (2026-03-23)


### Features

* Add a plan for a health check page and implement automated database migrations for local development. ([#90](https://github.com/BYKHD/ui-syncup/issues/90)) ([b527e54](https://github.com/BYKHD/ui-syncup/commit/b527e54c054b71268e2774913163d81c4036bea1))

# [0.4.0-beta.8](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.7...v0.4.0-beta.8) (2026-03-23)


### Features

* add standalone /health page ([#87](https://github.com/BYKHD/ui-syncup/issues/87)) ([81dbe4e](https://github.com/BYKHD/ui-syncup/commit/81dbe4e97ccb5a7883e085f5b100d69618cb0b6f))

# [0.4.0-beta.7](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.6...v0.4.0-beta.7) (2026-03-22)


### Bug Fixes

* trigger release ([a55c60c](https://github.com/BYKHD/ui-syncup/commit/a55c60c0a7f5ccf9c8a7c60c7742774d11ea3a4e))

# [0.4.0-beta.6](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.5...v0.4.0-beta.6) (2026-03-22)


### Bug Fixes

* trigger release ([e8a2c22](https://github.com/BYKHD/ui-syncup/commit/e8a2c226a72061f0b402eeec836330d83b1cf53f))

# [0.4.0-beta.5](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.4...v0.4.0-beta.5) (2026-03-22)


### Bug Fixes

* stop publishing root Next.js app to npm, rename CLI package, fix shebang, guard skip-ci ([e7a6c43](https://github.com/BYKHD/ui-syncup/commit/e7a6c4365d7add42ba787094a3f98c589ad355cf))

# [0.4.0-beta.4](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.3...v0.4.0-beta.4) (2026-03-22)


### Bug Fixes

* rename CLI package to ui-syncup-cli, add shebang banner, guard CI against skip-ci commits ([3e9ef29](https://github.com/BYKHD/ui-syncup/commit/3e9ef2970eae274752a5ed74eb9b88d424d60233))

# [0.4.0-beta.3](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.2...v0.4.0-beta.3) (2026-03-22)


### Bug Fixes

* skip CI pipeline on semantic-release back-commits ([418cdbb](https://github.com/BYKHD/ui-syncup/commit/418cdbb1e1b293bfb2adeb223c36d40b38f30868))

# [0.4.0-beta.2](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.1...v0.4.0-beta.2) (2026-03-22)


### Bug Fixes

* Remove manual changelog update instructions from versioning guide. ([d9cf394](https://github.com/BYKHD/ui-syncup/commit/d9cf3949c9c4a6700a40c0a85b4c06759bde96db))
* update image version comment to include `:beta` pre-release option ([142181b](https://github.com/BYKHD/ui-syncup/commit/142181b693dc26ddd398732f929f3140ac9720c1))


### Features

* Separate Docker image builds into dedicated workflows for pre-release and stable versions. ([c28d1ad](https://github.com/BYKHD/ui-syncup/commit/c28d1adda4f584a067b202d35448fa4d1766a389))

# [0.4.0-beta.2](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.1...v0.4.0-beta.2) (2026-03-22)


### Bug Fixes

* update image version comment to include `:beta` pre-release option ([142181b](https://github.com/BYKHD/ui-syncup/commit/142181b693dc26ddd398732f929f3140ac9720c1))


### Features

* Separate Docker image builds into dedicated workflows for pre-release and stable versions. ([c28d1ad](https://github.com/BYKHD/ui-syncup/commit/c28d1adda4f584a067b202d35448fa4d1766a389))

# [0.4.0-beta.2](https://github.com/BYKHD/ui-syncup/compare/v0.4.0-beta.1...v0.4.0-beta.2) (2026-03-22)


### Features

* Separate Docker image builds into dedicated workflows for pre-release and stable versions. ([c28d1ad](https://github.com/BYKHD/ui-syncup/commit/c28d1adda4f584a067b202d35448fa4d1766a389))

# [0.4.0-beta.1](https://github.com/BYKHD/ui-syncup/compare/v0.3.14...v0.4.0-beta.1) (2026-03-21)


### Features

* Configure semantic-release for automated versioning with beta support from `develop` and temporarily disable the setup page redirect. ([6f00c0e](https://github.com/BYKHD/ui-syncup/commit/6f00c0e2a4a5134a5dd37b8c4e842deacf268da7))
* Enable setup completion check and redirect to sign-in page. ([8b28b90](https://github.com/BYKHD/ui-syncup/commit/8b28b9007598fd8288290b9707872608c1f52923))

# Changelog

All notable changes to this project will be documented in this file.

This file is maintained by [semantic-release](https://github.com/semantic-release/semantic-release).

---

## [0.3.0] - 2026-03-19

### Features

- **Docker-native self-hosting** — production `docker/compose.yml` with profile-gated bundled services (`--profile db`, `--profile cache`, `--profile storage`)
- **CLI package** (`ui-syncup` on npm) — three-command lifecycle: `init` (setup wizard), `upgrade` (pull + restart), `doctor` (health diagnostics)
- **One-command installer** — `install.sh` bash wizard, no Bun or Node required on the host
- **Multi-arch Docker images** — `linux/amd64` + `linux/arm64` published to GHCR (`ghcr.io/bykhd/ui-syncup`) and Docker Hub (`bykhd/ui-syncup`)
- **Automated releases** — semantic-release pipeline: CHANGELOG generation, GitHub release, npm CLI publish, Docker image tagging
- **CI pipeline** — lint, typecheck, and test jobs on every PR via GitHub Actions
- **Health endpoint** — `GET /api/health` returns `{ status, version, timestamp }`; `HEAD /api/health` for uptime checks
- **OSS community files** — `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, GitHub issue templates, PR template

### Changes

- Dockerfile runner switched from `node:20-alpine` to `oven/bun:1-alpine` to support `bun run db:migrate` at container start
- `docker-compose.override.yml` → `docker/compose.dev.yml`
- `docker-compose.minio.yml` → `docker/compose.dev-minio.yml`
- CLI rebuilt as a standalone npm package (`cli/`) — removed old `up`, `down`, `reset`, `purge` commands

---
