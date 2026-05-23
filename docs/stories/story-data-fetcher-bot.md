# Story — data-fetcher-bot

**Epic:** Epic 3 — Bot scripts
**Depends on:** `story-cli-e2e-demo` (deployed factory address)
**Estimated:** 0.75 day
**Story slug:** `story-data-fetcher-bot`

## Goal

A Node.js script `bots/data-fetcher.ts` that acts as an AI agent commissioning scrape jobs via Auspex. Reads briefs from a canonical catalogue, picks one (random or deterministic via `--seed`), and posts a job naming the scraper bot as deliverer. Funds itself from a private key in `.env`.

## Acceptance criteria (BDD)

```
Given .env contains DATA_FETCHER_PRIVATE_KEY with funded Shannon wallet
When I run `pnpm bots:data-fetcher --once`
Then a job is posted to EscrowFactory
And the brief is one of the catalogue entries in `bots/shared/briefs.ts`
And the deliverer is the SCRAPER_PRIVATE_KEY's derived address
And the locked amount is between 0.3 and 0.5 STT
And the script logs structured JSON: `{ "event": "JobCreated", "escrow": "0x...", "brief": "...", "amount": "0.5" }`
And exit code is 0

Given .env DATA_FETCHER_PRIVATE_KEY is missing
When I run the script
Then it exits with code 1 and prints "DATA_FETCHER_PRIVATE_KEY required"

Given the wallet has insufficient balance (< 1 STT)
When the script attempts to post
Then it exits with code 2 and prints "Insufficient balance: need ≥ 1 STT"

Given `bots/shared/briefs.ts`
When I read the file
Then it exports `BRIEFS: Brief[]` with at least 3 entries
Each brief has: id, text, targetUrl (the URL the scraper will scrape), expectedExtract (used by tests, not on-chain)

Given `--seed=42` flag
When the script runs twice with the same seed
Then both runs pick the same brief deterministically (for reproducible demos)

Given `--count=3 --interval=2`
When the script runs
Then it posts 3 jobs with 2-second delays between them
And exits 0 after the third job
```

## File modification map

- `bots/package.json` — NEW — workspace manifest, dotenv, viem
- `bots/tsconfig.json` — NEW
- `bots/data-fetcher.ts` — NEW — main script
- `bots/shared/briefs.ts` — NEW — canonical brief catalogue (≥ 3 briefs)
- `bots/shared/wallet.ts` — NEW — viem wallet factory
- `bots/shared/log.ts` — NEW — structured JSON logger
- `bots/shared/contracts.ts` — NEW — ABI + addresses imported from `contracts/deployments/shannon.json`
- `package.json` — UPDATE — add `bots:data-fetcher` script

## Shell verification

```bash
cd bots
pnpm typecheck

# Dry run (validates wiring without sending tx)
pnpm tsx data-fetcher.ts --dry-run --once | grep -q '"event":"DryRun"'

# Actual run requires funded wallet:
# pnpm bots:data-fetcher --once
# Expected: a Shannon tx hash printed; exit 0
```

## Out of scope

- ❌ Listening for delivery (that's the scraper bot's job; data-fetcher fires-and-forgets in v1)
- ❌ Multi-domain brief catalogue (3 is fine for v1)
- ❌ Bot identity NFTs / reputation (v2)
- ❌ Acting on multiple chains
