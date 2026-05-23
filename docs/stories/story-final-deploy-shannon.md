# Story — final-deploy-shannon

**Epic:** Epic 5
**Depends on:** `story-top-up-forge-tests`, `story-bots-dashboard-page`
**Estimated:** 0.5 day
**Story slug:** `story-final-deploy-shannon`

## Goal

Deploy the final, audited contract set to Shannon testnet. Pin the addresses in `contracts/deployments/shannon.json`. Wire the Next.js app to read those addresses. Run a final E2E sanity check via the same `demo:e2e` script from Epic 1.

## Acceptance criteria (BDD)

```
Given a clean deployer wallet with > 35 STT on Shannon
When I run `pnpm run deploy:shannon`
Then EscrowFactory is deployed and verified on the explorer
And AuspexResolver is deployed and funded with 32 SOMI
And both addresses are written to `contracts/deployments/shannon.json`

Given the deployment completes
When I read shannon.json
Then it has shape: `{ "EscrowFactory": "0x...", "AuspexResolver": "0x...", "deployer": "0x...", "deployedAt": "<ISO date>", "blockNumber": <int> }`

Given app/.env.local
When I update NEXT_PUBLIC_ESCROW_FACTORY and NEXT_PUBLIC_AUSPEX_RESOLVER
Then `pnpm -F app build` succeeds with no env-related errors
And the deployed Vercel preview reads from those addresses

Given the deployed contracts
When I run `pnpm run demo:e2e` against the final deployment
Then a complete post → deliver → resolve → claim happy-path completes in < 60s
And `pnpm run demo:e2e -- --negative` produces a refund happy-path

Given the addresses are pinned
When I commit shannon.json + updated app env to the repo
Then `forge fmt --check`, `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass
```

## File modification map

- `contracts/script/deploy.ts` — NEW (or refine from Epic 1) — production deploy script
- `contracts/deployments/shannon.json` — UPDATE — final addresses
- `app/.env.local` — UPDATE (NOT committed) — final addresses
- `app/.env.example` — UPDATE — placeholder addresses point at expected shape

## Shell verification

```bash
# Run E2E against the final-deployment addresses
pnpm run demo:e2e | tail -5 | grep -E "Verdict: released|✓"
pnpm run demo:e2e -- --negative | tail -5 | grep -E "Verdict: refunded|✓"

# Addresses are 0x-format and pinned
jq -r '.EscrowFactory' contracts/deployments/shannon.json | grep -E "^0x[a-fA-F0-9]{40}$"
jq -r '.AuspexResolver' contracts/deployments/shannon.json | grep -E "^0x[a-fA-F0-9]{40}$"
```

## Out of scope

- ❌ Mainnet deploy
- ❌ Multi-network deploy
- ❌ Contract verification on the explorer beyond what hardhat does automatically
