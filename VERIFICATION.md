## Current update: date options across every timeframe

Default searches now use actual outbound dates rather than filtering monthly deals. Short windows check each day; longer windows sample seven dates, with explicit coverage. Selected round-trip stays apply to both providers. Partial results survive failures, quota is reserved per network attempt, and per-date caching avoids repeated calls after budget changes. Monthly deals remains an optional single-request search. Current checks and hosted proof are recorded under ignored `test-results/`; historical sections below are superseded where they describe one-request defaults.

# Getaway prototype verification — October 30, 2026

Historical initial-prototype record. Current provider selection and carrier behavior supersede the Amadeus/fallback-only behavior below; see README.md and DEPLOYMENT.md. Amadeus Self-Service has been retired and is no longer part of the app.

Built in `C:\Users\Nathan\Documents\Getaway Flight Planer`, outside OneDrive. Original handoff and concept files preserved. Native HTML/CSS/JavaScript + Node, zero third-party runtime dependencies. No production deployment performed.

## Real SerpApi results

The user supplied a key during implementation. It was saved only in ignored `.env.local`. All requests were server-side. The first no-key live report correctly reported a blocker; it was then replaced by a successful credentialed report.

| Search | Returned suggestions | Matching offers | Observations |
| --- | ---: | ---: | --- |
| ATL, next 60 days, round trip, up to USD 500 | 85 | 32 | Cheapest provider quote USD 38 round trip; displayed in the real app |
| LHR, next Monday–Sunday (Nov 2–8), round trip, up to USD 500 | 66 | 8 | International origin and shorter window verified |
| ATL, next 60 days, one way, up to USD 500 | 85 | 36 | USD 19–416; all normalized as one-way with no return date; matching departures Nov 14–Dec 19 |

Calls: `GET https://serpapi.com/search.json`, `engine=google_travel_explore`, `departure_id=ATL` or `LHR`, `currency=USD`, `type=1` or `2`, `hl=en`, `gl=us`, `travel_duration=2`; the LHR single-month window also sets `month=11`. Secrets omitted from this report. No flight-detail calls, booking-option resolution or account-balance calls were made.

Five total discovery attempts were made: the two live-script searches, two ATL round-trip requests across server restarts, and the one-way smoke test. Local ledger: 5/250 attempts, 245 remaining under the local safeguard. This is **not** a verified provider balance. Repeated ATL requests returned the same SerpApi-created timestamp and may have used its cache; no more than five searches could have been billed. Repeated searches within the running app were also verified to use its own 15-minute cache.

Source timestamps: ATL round-trip `2026-10-30 20:00:02 UTC`, LHR `2026-10-30 20:00:10 UTC`, ATL one-way `2026-10-30 20:02:41 UTC`. These are retrieval times, not guarantees of ticket freshness. Source response fields included destination name/country/airport, `start_date`, round-trip `end_date`, `flight_price`, `flight_duration`, `number_of_stops`, `airline`, `link` and `serpapi_link`. Hotel/thumbnail fields were ignored. Exact clock times and layover lengths were absent and were not invented.

One live View provider flight search link was opened from the actual UI in a new tab. Google Explore loaded Houston, Dec 5–12, travel from Atlanta, with a View flights action. This confirms destination/date navigation, not a guaranteed ticket or final fare. All normalized links are restricted to exact allowlisted HTTPS hosts.

Technical details: `test-results/live-report.json`, `test-results/oneway-live.json`. Screenshots: `test-results/desktop-live.png`, `test-results/mobile-live.png`.

## Automated and browser checks

- `npm test`: **14/14 passed**. Inclusive budget (80/120/499/500 eligible; 501 excluded), currency/trip separation, UTC-to-origin date boundaries, all date presets, next calendar week, bad/custom dates, 90-day returns, safe links, explicit demo, cache/coalescing, quota fallback, invalid keys, monthly reset, Amadeus OAuth/sandbox/currency rejection, timeouts, HTTP validation and server-source/secret isolation.
- Quota fallback to Travelpayouts was tested with controlled provider responses, including a subsequent search skipping exhausted SerpApi. Exhaustion and error notices are visible in the UI logic; failed provider searches never become demo inventory.
- Browser: demo initially showed eight fares through USD 500. Setting the cap to USD 120 showed exactly USD 80 and 120. Flight-detail expansion exposed a clearly labeled generic demo link. Real mode showed 32 returned offers and a real Google Explore link.
- Desktop breakpoint inspected around 1365 × 1000/1200 and narrow mobile around 390 × 844. DOM checks found no horizontal page overflow at either width. Mobile rows stack destination/fare, dates/airline and journey/details.
- The browser reported an active service worker. After stopping the server and reloading, the cached application shell still loaded and displayed “Server unavailable. Flight searches need an internet connection.” The server was restarted afterwards. API responses were not replayed by the worker. This is a disconnected-server offline-shell test, not a physical airplane-mode test.
- Manifest, standalone mode and 192/512 PNG icons are present. **Actual native PWA installation on Android/iPhone/desktop was not performed**; that remains a device acceptance check over HTTPS/localhost. Localhost on a phone is not this PC.
- Browser console had no warnings/errors during the healthy online flow. Reference-image look is implemented with native colors, grid rows and typography; no stock photography was bundled.

## Remaining limits

Travelpayouts and Amadeus have working adapters and controlled-response tests but no supplied credentials, so their real-service access is unverified. Amadeus sandbox is explicitly labeled and its usual EUR quotes cannot be used against a USD cap. Choose EUR to use EUR inspiration data. No automatic FX conversion.

Explore produces partial destination suggestions; date filters are enforced locally. Some suggestions represent attractions around an airport, and several suggestions can share an identical airport/fare. No matching returned deals does not mean no flights exist. Ground travel, tax inclusion, mandatory fee completeness, ticket availability and native device installation are not certified.

The usable local prototype and real SerpApi integration are verified. The next device check is installing it from an HTTPS-served instance. Secondary fallback providers need their own credentials for live validation.
