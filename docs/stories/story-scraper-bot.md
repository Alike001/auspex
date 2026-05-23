# Story — scraper-bot

**Epic:** Epic 3
**Depends on:** `story-data-fetcher-bot`
**Estimated:** 1 day
**Story slug:** `story-scraper-bot`

## Goal

A Node.js script `bots/scraper.ts` that listens for `JobCreated` events where it is the deliverer, performs the scrape using the target URL from the brief, hosts the result on a temporary endpoint, and submits the URL as the delivery via `Escrow.submitDelivery`. Then waits for `JobResolved` and calls `Escrow.claim` if released.

## Acceptance criteria (BDD)

```
Given .env contains SCRAPER_PRIVATE_KEY with funded Shannon wallet
When I run `pnpm bots:scraper`
Then the script subscribes via `somnia_watch` to `JobCreated` events from EscrowFactory
And logs "Scraper online · 0x...address"

Given a JobCreated event arrives where deliverer matches the scraper's address
When the event handler fires
Then the script reads the brief from briefURI
And performs a scrape (HTTP GET + simple JSON parse) of the brief's targetUrl
And generates a stable result URL (served from a local Express server on port 8788 — `http://localhost:8788/delivery/[jobId]`)
And calls `Escrow.submitDelivery(resultUrl)` via wagmi-style writeContract
And logs JSON: `{ "event": "DeliverySubmitted", "escrow": "0x...", "deliveryUrl": "..." }`

Given submitDelivery resolves
When the script waits up to 60s for `JobResolved` event
Then on success it logs `{ "event": "JobResolved", "verdict": "released" }`
And if verdict = "released", it calls `Escrow.claim()` and logs `{ "event": "PayoutClaimed" }`

Given verdict = "refunded"
When JobResolved arrives
Then the script logs the refund without calling claim (refund is the client's call)

Given the scrape fails (target URL 5xx or timeout)
When the failure is caught
Then the script submits a deliberately bad URL (e.g. http://localhost:8788/error)
And logs `{ "event": "ScrapeFailed", "reason": "..." }`
(This ensures Auspex still resolves the job — to "refunded" — instead of leaving it dangling)

Given a `--demo-mode` flag
When set
Then the scraper accepts ALL JobCreated events (not just ones naming it as deliverer), useful for local playback dev
```

## File modification map

- `bots/scraper.ts` — NEW — main listener + scrape loop
- `bots/shared/scrape.ts` — NEW — HTTP GET + JSON extract helper (no headless browser in v1)
- `bots/shared/host-delivery.ts` — NEW — embedded Express server serving delivery JSON
- `bots/shared/watch-events.ts` — NEW — `somnia_watch` wrapper for the JobCreated subscription
- `package.json` — UPDATE — add `bots:scraper` script + `express` dep

## Shell verification

```bash
cd bots
pnpm typecheck

# Dry run: synthesize a JobCreated event without on-chain tx
pnpm tsx scraper.ts --dry-run --synthesize-event "0x..." --target-url "https://example.com" | grep -q '"event":"DeliverySubmitted"'
```

## Out of scope

- ❌ Multi-job parallel handling (v1: serial, one at a time)
- ❌ Headless-browser scraping (Playwright) — v2; v1 uses simple HTTP GET
- ❌ Authentication / API keys for scrape targets
- ❌ Persistent delivery hosting (Vercel/static) — v1 uses local Express
