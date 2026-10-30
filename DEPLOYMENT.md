# Getaway — GitHub and Vercel delivery

Requested October 30, 2026: verify returned-flight coverage, fix unreadable dropdowns, upload source to GitHub and verify a Vercel build.

## Reviewed source

- Repository: `questforgelitrpg/getaway`, existing `main` branch. Its initial README commit is preserved as the parent of the application upload.
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
