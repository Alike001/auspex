# Story — hardhat-foundry-scaffold

**Epic:** Epic 1 — Contract foundation + agent composition
**Depends on:** None (sprint kickoff story)
**Estimated:** 0.5 day
**Story slug:** `story-hardhat-foundry-scaffold`

## Goal

Stand up the monorepo with `contracts/` workspace containing Foundry (for tests) and Hardhat (for deploy), both configured for Somnia Shannon testnet (Chain ID 50312). No business logic yet — just a clean scaffold a deployer can hit with `forge test` and `npx hardhat compile`.

## Acceptance criteria (BDD)

```
Given a fresh clone of the repo
When I run `pnpm install` at the root
Then `node_modules` materializes in the root and in each workspace
And `pnpm-workspace.yaml` lists `contracts`, `app`, `bots` as workspaces

Given the contracts workspace
When I run `forge --version` inside `contracts/`
Then Forge reports a version ≥ 0.2.0

Given the contracts workspace
When I run `forge build`
Then exit code is 0 and `out/` is created

Given the contracts workspace
When I run `forge test`
Then exit code is 0 and at least 1 placeholder test passes (the scaffolding ships with one smoke test)

Given the contracts workspace and a populated `.env.local` with `PRIVATE_KEY`
When I run `npx hardhat compile`
Then exit code is 0 and `artifacts/` is created

Given hardhat.config.ts
When I read the file
Then it defines a network named `somniaShannon` with chainId `50312`
And the RPC URL is `https://api.infra.testnet.somnia.network`
```

## File modification map

- `package.json` — NEW — root workspace manifest with pnpm workspaces config
- `pnpm-workspace.yaml` — NEW — lists `contracts`, `app`, `bots`
- `.gitignore` — NEW — standard Node + Foundry + Hardhat ignores
- `.env.example` — NEW — placeholder values per architecture.md §13
- `contracts/package.json` — NEW — Hardhat + deps
- `contracts/foundry.toml` — NEW — Forge config, src/test paths
- `contracts/hardhat.config.ts` — NEW — Somnia Shannon network (per `sdk-snippets.md` §10)
- `contracts/.gitignore` — NEW — `out/`, `cache/`, `artifacts/`
- `contracts/src/.gitkeep` — NEW
- `contracts/test/Smoke.t.sol` — NEW — one passing assertion (validates Forge wiring)
- `README.md` — NEW — placeholder; final README ships in Epic 5

## Shell verification

```bash
# From repo root
pnpm install
# Workspace install completes without errors

cd contracts
forge --version       # > 0.2.0
forge build           # exit 0
forge test            # exit 0, 1 passing
npx hardhat compile   # exit 0
```

All four commands must exit 0.

## Out of scope

- ❌ Writing EscrowFactory.sol or Escrow.sol (next story)
- ❌ Deploying anything (later story)
- ❌ Wiring the agent platform interface (next story)
- ❌ Wallet UI / RainbowKit setup (Epic 2)
