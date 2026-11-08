# Getaway Flight Finder

A small airport-board styled PWA for “Where can I go, how soon, and how cheap?” Built in this folder from `Getaway — Codex Prototype Build Han.txt` (the supplied handoff is a TXT, not the named Markdown file). Both original documents are preserved. The later user request adds provider fallback.

## Run

Node.js 22+ (tested with 24). No dependencies, install step, bundler or build command required.

```powershell
cd 'C:\Users\Nathan\Documents\Getaway Flight Planer'
npm start
```

Open <http://localhost:3000>. Stop with Ctrl+C. `npm run dev` restarts Node on source changes. `npm test` runs the automated checks. `npm run test:live` makes up to two real searches (ATL / anytime / $500, LHR / next week / $500) and writes a nonsecret `test-results/live-report.json`. It records a blocker and uses zero provider requests without configured keys. Do not run the live script concurrently with the server: the local quota file is intended for one process at a time.

## Providers and carrier selection

The supplied SerpApi key is configured locally in ignored `.env.local`. It never goes to the browser. For a fresh copy, copy `.env.example` to `.env.local`, fill in credentials and restart. Do not copy `.env.example` over an existing key file.

- SerpApi: `SERPAPI_KEY`. One `google_travel_explore` request, with one-week stay suggestions for round trips. No automatic detail requests.
- Travelpayouts: `TRAVELPAYOUTS_TOKEN`. One cached-fare discovery page (up to 1,000 returned records). If the page is full, the UI warns that more provider records may exist.
- Amadeus Self-Service is retired and has been removed from the runtime, UI and key template. Old Amadeus environment variables, if present, are ignored.

**Both providers** is the default: every configured provider is searched once and all its matching offers are merged and sorted by price. A successful SerpApi response no longer prevents Travelpayouts from running. Per-row labels and per-provider counts show which service supplied each offer. **SerpApi only** and **Travelpayouts only** allow explicit source selection without spending the other provider's quota. Selecting an unconfigured provider shows an error, not demo inventory. Demo is automatic only when Both providers is selected and neither provider is configured; it can also be selected explicitly.

The up-to-three-search control and request loops have been removed. Each uncached search makes at most one discovery request per selected configured service. The local app still reserves quota per actual request; a failed or exhausted provider does not block the other selected provider.

The optional **Carrier** field accepts a two-character airline IATA code (for example `DL` for Delta). A small common-carrier list provides names, while manual valid codes remain supported. These are not verified carriers operating at the selected airport. SerpApi receives `include_airlines` so a requested carrier can be discovered upstream; Travelpayouts' cached-fare endpoint does not support that query filter, so its returned records are filtered locally. Quotes with no matching reported carrier code are excluded. Connecting segments may involve other airlines.

The app does not reserve slots for Frontier, deduplicate by cheapest carrier, or remove more expensive carriers on the same route. Explore and cached-fare discovery themselves favor low prices and do not return every alternative airline, departure or itinerary. A carrier filter cannot recover offers that a source never returned, except by making a carrier-specific provider query where supported.

SerpApi's official pricing was checked on October 30, 2026: free plan 250 searches/month, 50/hour. These are account limits, not a promise of 250 UI searches remaining. Local persistent counters in `.runtime/quota.json` count conservative discovery attempts (including failures). Monthly ceilings default to 250 for SerpApi and 100 for Travelpayouts; the latter is an app safeguard, **not its official quota**. A reported upstream quota exhaustion stops further attempts for that provider until the next UTC calendar month. If an hourly limit or an earlier account renewal caused this, stop the server and clear only that provider's `:exhausted` entry in the local ledger after confirming account access has resumed. No automatic subscriptions or paid upgrades.

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

The existing GitHub repository is [natessideprojects/getaway](https://github.com/natessideprojects/getaway), and the Vercel project is `getaway` in Nathan Hudson's projects. `vercel.json` selects Node 24 through project/package configuration, runs `npm run build` (tests plus PWA asset checks), serves only `public/`, and routes `/api/*` to `api/index.mjs`. The serverless entry uses the same provider engine as localhost without filesystem writes.

Configure `SERPAPI_KEY` as a sensitive server-side Vercel environment variable; never put it in GitHub or public assets. The supplied key has been configured for Preview and Production. Existing Vercel deployment protection is preserved. Deployment verification is recorded in `DEPLOYMENT.md`.

On hosted instances, the in-memory quota counters and 15-minute cache are per instance and reset with cold starts/redeployments; the UI labels this explicitly. They are not an account-wide quota guarantee. The provider enforces its own account limits. Keep deployment protection for personal use; a shared public service would need an account-wide quota store and request limiting. No new database or paid subscription is introduced here.

All dropdowns explicitly set popup background/text colors, avoiding the Windows white-menu/pale-text problem. The offline shell cache is versioned to pick up changed UI assets.

## Official API references

- [SerpApi Explore parameters and response](https://serpapi.com/google-travel-explore-api)
- [SerpApi free tier and caching billing](https://serpapi.com/pricing)
- [Travelpayouts Aviasales cached-fare API](https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API)
- [SerpApi upstream carrier parameters](https://serpapi.com/google-travel-explore-api)
- [Amadeus Self-Service retirement notice](https://developers.amadeus.com/toolbox)

## Destination regions

Choose Anywhere or North America, South America, Europe, Africa, Asia or Oceania. Both providers apply the selection against arrival-airport geography. SerpApi also receives the corresponding arrival region where a verified region ID exists; Oceania and Travelpayouts filter returned suggestions locally. Unknown destinations are excluded from selected regions, with counts under Data sources. North America includes Central America and the Caribbean. Geography is a compact server-only [OurAirports public-domain snapshot](https://ourairports.com/data/); see `lib/data/README.md`. This filter does not make discovery exhaustive.

## Date options (default)

All timeframe presets now query actual departure dates instead of filtering monthly cheapest-date suggestions. Today/Tomorrow query one date; Next week and custom windows of up to seven days query every day. Longer windows sample seven evenly spaced dates including endpoints, limited to returns within 90 days. The checked dates and partial failures are displayed. Round trips use 3, 7 (default) or 14 nights; both sources are filtered to that stay.

A search can consume up to seven SerpApi requests plus one Travelpayouts request. Each network request reserves quota. Date requests run with concurrency at most three after the first; completed dates survive errors/quota exhaustion and failed/unattempted dates are listed. Successful per-date responses cache for 15 minutes, including across budget changes. Monthly deals is an explicit one-request alternative. Neither mode is exhaustive flight inventory; Travelpayouts remains cached cheapest-fare data.
