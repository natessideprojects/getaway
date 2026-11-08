## Current update: date options across every timeframe

Default searches now use actual outbound dates rather than filtering monthly deals. Short windows check each day; longer windows sample seven dates, with explicit coverage. Selected round-trip stays apply to both providers. Partial results survive failures, quota is reserved per network attempt, and per-date caching avoids repeated calls after budget changes. Monthly deals remains an optional single-request search. Current checks and hosted proof are recorded under ignored `test-results/`; historical sections below are superseded where they describe one-request defaults.

# Getaway — GitHub and Vercel delivery

## Current provider correction

The up-to-three-search option is removed. Both providers now runs each configured source once and merges all matching offers, instead of stopping at the first successful SerpApi response. Explicit SerpApi-only and Travelpayouts-only modes are available. Returned offers carry their actual provider/source/freshness labels. Exhaustion or failure of one selected service does not prevent the other selected service from contributing.

Optional carrier selection sends `include_airlines` to SerpApi. Travelpayouts carrier filtering is local because its selected cached-fare endpoint has no carrier query parameter. The common-carrier list does not claim airport-specific route coverage. No local cheapest-per-route reduction or carrier slot limit is applied. Discovery sources themselves are price-focused and incomplete. Removed retired Amadeus Self-Service integration and obsolete key-template entries.

`npm run build` passes 26 tests including successful-source merging, preservation of a more expensive same-route carrier, explicit Travelpayouts selection, upstream carrier queries, returned-carrier checks, currency rejection, independent quota limits, and removal of multi-request/Amadeus paths. Existing date/budget/timezone, cache, URL and serverless checks also pass. Hosted verification is recorded separately in ignored test-results artifacts to avoid changing the exact source commit after it is deployed.

The sections below preserve the earlier delivery history and are superseded where provider behavior differs.

Requested October 30, 2026: verify returned-flight coverage, fix unreadable dropdowns, upload source to GitHub and verify a Vercel build.

## Reviewed source

- Repository: `natessideprojects/getaway`, existing `main` branch. Its initial README commit is preserved as the parent of the application upload.
- Project: Vercel `getaway`, `prj_pfQ8tpiMQyjcm29Yb8Huemqj5RNt`, Nathan Hudson's projects. Existing deployment protection retained.
- Runtime: Node 24, static assets in `public/`, one shared Web-standard Node function at `api/index.mjs`.
- Secret: SerpApi key is a sensitive Vercel environment variable for Preview and Production. `.env.local`, runtime counters, original supplied TXT documents and local test artifacts are excluded from both source upload and deployment files.

## Coverage findings and fixes

Every qualifying retrieved offer is shown, with no local result limit. Added visible counts for raw offers, matches and filter exclusions. A large controlled response of 502 offers retains all 501 at/below the inclusive budget.

Explore returns destination suggestions, not exhaustive flight inventory; it has no documented discovery-page pagination. The initial standard search selects the one-week bucket, so it cannot support an all-flights claim. Added an explicit Broader option: up to three round-trip stay buckets (one week, weekend, two weeks), or up to three months for one way. Standard remains one request to conserve free quota. Travelpayouts broader discovery follows full pages up to three requests and reports the page cap. All calls reserve quota individually; partial completed responses survive a later quota/error stop.

Native dropdown options now have explicit dark text on a light background, with a yellow selected option. Closed selects retain the dark board styling. All dropdowns share the same rule.

## Verification before upload

`npm run build`: 20/20 tests passed and PWA asset preparation succeeded. Includes original validation, currency, timezone, fallback/cache and security checks; new cases cover 501 retained offers, the three discovery buckets and their request accounting, partial quota stops, Travelpayouts pagination, empty-result audit counts and the serverless Web handler without filesystem writes.

Live coverage audit and hosted verification are recorded in the delivery update below. Exact flight coverage remains limited to what each configured provider returns. Secondary providers have controlled-response tests but no supplied live credentials. Native phone installation is still a device acceptance check.

Live local audit: CHA, next 30 days, round trip, USD 150, Broader discovery issued three SerpApi requests and received 259 suggestions in total. None met the full date/budget filters. These are excluded provider suggestions, not an application truncation and not evidence that no such flights exist. Local private report: `test-results/coverage-live.json`. This audit used three discovery requests; previously configured local counters also include the user's own interactive searches.

## Hosted verification

The first application commit `8ddbfdc349026099f63ad8b3705d01e0f847ed8e` built successfully on Vercel and reached READY in about eight seconds. Production alias: `https://getaway-gules.vercel.app`. The hosted `/api/status` returned HTTP 200 with SerpApi configured and instance-scoped counters, confirming the deployed function can access its server-only environment variable without attempting a quota-file write. Existing unique-deployment URL authentication remains enabled; the production alias is reachable with the existing project protection settings.

Computed styles were inspected in the deployed browser for all six selects: closed field `#1b211d` / text `#f2f2e8`, popup options `#f4f1e7` / text `#172017`, selected option `#f4cf48` / text `#172017`. Native popup overlays are not included in the in-app browser's page screenshots, so the evidence here is computed browser style plus control operation rather than an OS-popup screenshot.

That browser check also exposed an older malformed option tag that made Today plain text instead of a selectable date preset. Corrected it and added a build-time malformed-closing-tag check. The follow-up source commit contains that correction. The remote build-events connector returned HTTP 404; deployment READY status and deployed HTTP/browser behavior are used as the direct verification evidence.
