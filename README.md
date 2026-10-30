# Getaway Flight Finder

A small airport-board styled PWA for “Where can I go, how soon, and how cheap?” Built in this folder from `Getaway — Codex Prototype Build Han.txt` (the supplied handoff is a TXT, not the named Markdown file). Both original documents are preserved. The later user request adds provider fallback.

## Run

Node.js 22+ (tested with 24). No dependencies, install step, bundler or build command required.

```powershell
cd 'C:\Users\Nathan\Documents\Getaway Flight Planer'
npm start
```

Open <http://localhost:3000>. Stop with Ctrl+C. `npm run dev` restarts Node on source changes. `npm test` runs the automated checks. `npm run test:live` makes up to two real searches (ATL / anytime / $500, LHR / next week / $500) and writes a nonsecret `test-results/live-report.json`. It records a blocker and uses zero provider requests without configured keys. Do not run the live script concurrently with the server: the local quota file is intended for one process at a time.

## Keys and fallback

The supplied SerpApi key is configured locally in ignored `.env.local`. It never goes to the browser. For a fresh copy, copy `.env.example` to `.env.local`, fill in credentials and restart. Do not copy `.env.example` over an existing key file.

- SerpApi: `SERPAPI_KEY`. Standard discovery uses one `google_travel_explore` request. Broader discovery uses up to three: weekend / one-week / two-week buckets for round trips, or up to three departure months for one way. No detail fan-out.
- Travelpayouts: optional `TRAVELPAYOUTS_TOKEN`. Standard discovery fetches one cached-fare page (up to 1,000 records). Broader discovery follows full pages up to three requests. A notice reports possible remaining pages when the request cap is hit. No credentials were supplied or live-tested for this provider.
- Amadeus: optional `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `AMADEUS_ENV=test` or `production`. One discovery call, plus one OAuth request if a token needs refreshing. Test responses are explicitly labeled SANDBOX, not real inventory. Inspiration commonly returns EUR; select EUR. Responses in a different/unverified currency are rejected, never numerically compared to your budget. No live credentials supplied for this provider.

Automatic order is SerpApi → Travelpayouts → Amadeus. Empty filtered responses, errors, timeouts, rejected keys and exhausted quotas trigger the next configured adapter with visible notices. With a failed live search, no invented prices are substituted. Choose Demo data explicitly to inspect fictional fares. Without any configured provider the app automatically displays labeled demo data.

SerpApi's official pricing was checked on October 30, 2026: free plan 250 searches/month, 50/hour. These are account limits, not a promise of 250 UI searches remaining. Local persistent counters in `.runtime/quota.json` count conservative discovery attempts (including failures). Monthly ceilings default to 250 / 100 / 100 respectively; secondary-provider defaults are app safeguards, **not their official quotas**. A reported upstream quota exhaustion stops further attempts for that provider until the next UTC calendar month. If an hourly limit or an earlier account renewal caused this, stop the server and clear only that provider's `:exhausted` entry in the local ledger after confirming account access has resumed. No automatic subscriptions or paid upgrades.

Results are cached in memory for 15 minutes (failure responses 30 seconds); identical simultaneous searches share one request. At most 100 normalized searches are cached. Opening/reloading the app or expanding a result spends no live quota. No account-balance endpoint is called. External links never contain API keys.

## Scope and data honesty

- Origin search includes 49 common worldwide airports, including ATL, CHA, TYS, JFK, LHR, CDG and HND. Entering an unlisted three-letter code requires its IANA timezone; the provider ultimately determines whether a code has coverage.
- Today/tomorrow use the airport's local date. Next week means next Monday–Sunday; Next 30 days includes today plus 29 days; Anytime includes today plus 59 days. Custom dates and round-trip returns are bounded by today + 90 days. Dates without supplied times remain dates, not invented departures.
- Budget is an inclusive maximum on quoted total trip fare, with blank meaning uncapped. Round trip and one way are distinct; USD and EUR never mix. Price sort is the default; missing durations sort last.
- Explore uses flexible months and preset one-week suggestions; all-month queries may return fares beyond the app horizon which are removed locally. Arbitrary date-window coverage is incomplete. No exhaustive inventory claim. Today/tomorrow can legitimately return no matching suggestions.
- Every matching offer in the retrieved set is rendered; no local pretty-list cutoff. The visible audit shows provider offers retrieved, matching and excluded, with zero locally truncated results. An automated 502-offer case retains all 501 offers at/below the cap. Multiple provider destination labels can share an arrival airport. Some labels are attractions; arrival airport is shown, ground transport is not included.
- Expand Details for the provider's flight-search link. Unsafe URLs fall back to an explicitly labeled generic Google Flights search. Only HTTPS on exact Google/Aviasales allowlisted hosts is accepted. A search link does not guarantee a specific ticket or price.
- Explore provides indicative fares and source retrieval timestamps, not a guaranteed fresh ticket quote. No departure times, layover airports/lengths or tax inclusion are inferred. Optional fees may apply.

## PWA and phone use

Includes a web manifest, 192px and 512px PNG icons, standalone display, install prompt support and a service worker that caches only the app shell. `/api/` responses and secrets are never stored by the worker. Searches need internet; offline or disconnected-server failures are visible.

On supported Chrome/Edge, use Install app; on iPhone Safari use Share → Add to Home Screen. Installation needs HTTPS or desktop localhost. `http://localhost:3000` on your phone refers to the phone, **not this PC**. A real phone needs an HTTPS deployment of the Node server or an HTTPS LAN proxy with `HOST=0.0.0.0`. Never publish `.env.local` or serve the project root as static files. This is a local single-user prototype; public deployment requires rate limiting/access control and a multi-instance quota store before sharing credentials with traffic.

## Files

- `server.mjs`: tiny Node HTTP server; static files from `public/` only, server-only API proxy.
- `lib/search.mjs`, `lib/providers.mjs`, `lib/engine.mjs`: validation, normalization, adapters, fallback, quota and caching.
- `public/`: single-screen interface, local airport catalogue, fictional fixture, styles, manifest, icons and offline worker. Reference photographs informed the design; no stock-photo watermarks or unlicensed images were embedded.
- `tests/search.test.mjs`: meaningful logic/adapter/HTTP regression checks with fake provider responses.
- `scripts/live-check.mjs`: explicit bounded live smoke test; no keys logged.
- `VERIFICATION.md`: tested results and remaining limits.

## Vercel

The existing GitHub repository is [questforgelitrpg/getaway](https://github.com/questforgelitrpg/getaway), and the Vercel project is `getaway` in Nathan Hudson's projects. `vercel.json` selects Node 24 through project/package configuration, runs `npm run build` (tests plus PWA asset checks), serves only `public/`, and routes `/api/*` to `api/index.mjs`. The serverless entry uses the same provider engine as localhost without filesystem writes.

Configure `SERPAPI_KEY` as a sensitive server-side Vercel environment variable; never put it in GitHub or public assets. The supplied key has been configured for Preview and Production. Existing Vercel deployment protection is preserved. Deployment verification is recorded in `DEPLOYMENT.md`.

On hosted instances, the in-memory quota counters and 15-minute cache are per instance and reset with cold starts/redeployments; the UI labels this explicitly. They are not an account-wide quota guarantee. The provider enforces its own account limits. Keep deployment protection for personal use; a shared public service would need an account-wide quota store and request limiting. No new database or paid subscription is introduced here.

All dropdowns explicitly set popup background/text colors, avoiding the Windows white-menu/pale-text problem. The offline shell cache is versioned to pick up changed UI assets.

## Official API references

- [SerpApi Explore parameters and response](https://serpapi.com/google-travel-explore-api)
- [SerpApi free tier and caching billing](https://serpapi.com/pricing)
- [Travelpayouts Aviasales cached-fare API](https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API)
- [Amadeus inspiration OpenAPI specification](https://github.com/amadeus4dev/amadeus-open-api-specification/blob/master/spec/json/FlightInspirationSearch_v1_swagger_specification.json)
- [Amadeus coverage limitations](https://admin.developers.amadeus.com/self-service/apis-docs/guides/developer-guides/faq/)
