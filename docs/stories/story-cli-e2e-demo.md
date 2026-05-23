# Story — cli-e2e-demo

**Epic:** Epic 1 (closing story)
**Depends on:** `story-resolver-llm-judge-step`
**Estimated:** 1 day
**Story slug:** `story-cli-e2e-demo`

## Goal

A Node.js script `contracts/script/demo-e2e.ts` that deploys EscrowFactory + AuspexResolver to Shannon testnet, creates a hardcoded job, submits a delivery URL, waits for the agent composition to resolve, and prints the verdict + reasoning. This proves the contracts work against the REAL Somnia platform, not just mocks. Closes Epic 1.

## Acceptance criteria (BDD)

```
Given a populated `.env.local` with `PRIVATE_KEY` (deployer) and `SCRAPER_PRIVATE_KEY` (deliverer)
And the deployer has > 35 STT on Shannon (covers deploy + 32 SOMI for resolver)
When I run `pnpm run demo:e2e`
Then EscrowFactory is deployed and its address is logged
And AuspexResolver is deployed and funded with 32 SOMI
And both addresses are written to `contracts/deployments/shannon.json`

Given the deployment succeeds
When the demo creates a job with brief "The page at the delivered URL must have an H1 reading 'Hello Auspex'"
Then a new Escrow address is logged
And the escrow's locked amount = 0.5 STT
And the resolution budget = 0.36 STT

Given a job in state Open with a hosted demo URL
When the demo (acting as the deliverer) submits the URL containing the expected H1
Then `submitDelivery` fires
And within 60 seconds, `JobResolved` event arrives via the WebSocket subscription
And the verdict is "released"
And the reasoning string contains "Hello Auspex"

Given the demo run completes
When I read the log output
Then it shows:
  - all 3 agent step request IDs
  - the verdict + reasoning string
  - the final on-chain claim transaction hash
And exit code is 0

Given a delivered URL that does NOT contain the expected H1
When the demo (in `--negative` mode) runs the same flow against a non-matching URL
Then the verdict is "refunded"
And the client wallet receives the refund
And exit code is 0
```

## File modification map

- `contracts/script/demo-e2e.ts` — NEW — Hardhat scripted deploy + viem-driven happy path + negative path (`--negative` flag)
- `contracts/script/lib/await-event.ts` — NEW — Helper: subscribe via `somnia_watch` for a specific event then resolve a Promise
- `contracts/script/lib/host-demo-page.ts` — NEW — Tiny inline HTTP server that serves a static HTML with a configurable H1 (lets the demo control the delivered URL content)
- `contracts/deployments/shannon.json` — NEW (initial) — `{ "EscrowFactory": "0x...", "AuspexResolver": "0x..." }`
- `package.json` — UPDATE — add `demo:e2e` script

## Shell verification

```bash
# Prereqs: .env.local has PRIVATE_KEY + SCRAPER_PRIVATE_KEY; deployer wallet has > 35 STT

pnpm run demo:e2e
# Expected output (truncated):
# ✓ Deployed EscrowFactory at 0x...
# ✓ Deployed AuspexResolver at 0x..., funded 32 SOMI
# ✓ Created job 0x..., locked 0.5 STT
# ✓ Submitted delivery: http://localhost:8787/correct
# ⏳ Awaiting JobResolved...
# ✓ Verdict: released
# ✓ Reasoning: Verdict: released · Evidence: ...Hello Auspex...
# ✓ Claimed payout: tx 0x...
# Total elapsed: 18.4s

pnpm run demo:e2e -- --negative
# Expected: verdict "refunded", client refund claim succeeds
```

Both invocations must exit 0.

## Out of scope

- ❌ Frontend (Epic 2)
- ❌ Bots (Epic 3)
- ❌ Live demo UI button (Epic 4)
- ❌ Final test suite top-up (Epic 5)
