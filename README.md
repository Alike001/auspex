# Auspex

**Lock funds against a brief, deliver a URL — three on-chain Somnia agents judge the work and settle in one block.**

**[Watch the demo →](https://youtu.be/wq2Wt0MccVg)**

**Live app: [auspex-app.vercel.app](https://auspex-app.vercel.app)**

*Built for the Somnia Agentathon 2026 (Encode Club × Somnia Network) — Agentic L1 track. Uses Somnia's composed on-chain agents: JSON API + Parse Website + LLM Inference.*

---

## The problem

Escrow needs a neutral arbiter. Human arbitration (Upwork support, Kleros jurors) is slow, expensive, and doesn't exist at all for the thing coming next: autonomous agents paying each other for work. When one agent hires another to scrape a page or fetch data, there's no human in the loop to decide whether the delivery met the brief — and no way to release or refund payment without trusting one side.

## The solution

Auspex is an escrow protocol where the arbiter is on-chain AI. A client locks STT against a plain-text brief and names a deliverer. The deliverer submits a URL. Three composed Somnia agents — JSON API, Parse Website, and an LLM judge — read the delivery, score it against the brief, and the escrow releases or refunds in the same block, with the verdict's reasoning emitted on-chain. No human, no off-chain oracle.

## Demo

- **Live app** — [auspex-app.vercel.app](https://auspex-app.vercel.app)
  - `/jobs` — post a job, watch it get judged, claim the payout (connect an injected wallet on Somnia Shannon).
  - `/bots` — the agent-commerce dashboard. Loads in playback mode and replays a real recorded 12-job run: two bots transacting, the resolution pipeline animating, the feed filling in. "Run live demo" fires the real bots locally.
- **Demo video** — [Watch the demo](https://youtu.be/wq2Wt0MccVg)

## Run locally

```bash
git clone https://github.com/Alike001/auspex.git
cd auspex
pnpm install
```

Copy the example env files and fill in your keys (testnet only — never a mainnet key):

```bash
cp app/.env.example app/.env.local
cp contracts/.env.example contracts/.env.local
cp bots/.env.example bots/.env.local
```

```bash
# Terminal 1 — the web app
pnpm --filter app dev
```

```bash
# Terminal 2 — deploy + run one full resolution end-to-end on Shannon
pnpm --filter @auspex/contracts demo:e2e
```

```bash
# Terminal 3 — the autonomous bot demo (data-fetcher posts jobs, scraper delivers + claims)
pnpm bots:demo --count=3
```

Then open [localhost:3000](http://localhost:3000). The app runs against the live deployed contracts with no env vars at all (addresses are pinned); the `.env` files only matter for running the bots and deploying your own contracts.

## Stack

| Layer | Technology |
| ----- | ---------- |
| Smart contracts | Solidity 0.8.24 — Foundry (tests) + Hardhat (deploy + verify) |
| Arbitration | **Somnia on-chain agents** — JSON API + Parse Website + LLM Inference, composed in one resolution |
| Chain | **Somnia Shannon testnet** (chainId 50312) |
| Frontend | Next.js 16 (App Router) + Tailwind v4 |
| Web3 | wagmi v3 + RainbowKit + viem |
| Bots | Node + tsx — `data-fetcher` (client) and `scraper` (deliverer) |

## Architecture

```
                ┌──────────────────────────────┐
  Client   ────▶│  Next.js app                 │
  wallet        │  /jobs   (post · judge · claim)
                │  /bots   (live agent dashboard)
                └──────────────┬───────────────┘
                               │ wagmi / viem · Shannon RPC
                               ▼
   ┌─────────────────────────────────────────────────────────┐
   │  Somnia Shannon testnet                                  │
   │                                                          │
   │   EscrowFactory ──spawns──▶ Escrow (one per job)         │
   │                                  │ resolve()             │
   │                                  ▼                       │
   │   AuspexResolver ── composes 3 agent calls ──┐           │
   │     JSON API  →  Parse Website  →  LLM judge  │           │
   │                                              ▼           │
   │          validators sign verdict → release / refund      │
   └─────────────────────────────────────────────────────────┘
                               ▲
                               │ post · deliver · claim
   ┌───────────────────────────┴─────────────────────────────┐
   │  Bots — data-fetcher + scraper                           │
   │  autonomous agent-to-agent commerce (the /bots demo)     │
   └──────────────────────────────────────────────────────────┘
```

Deployed and **source-verified** on Shannon Blockscout:

| Contract | Address |
| -------- | ------- |
| EscrowFactory | [`0x00730838086b6f3c7a6d5443a17D021FA714FD93`](https://shannon-explorer.somnia.network/address/0x00730838086b6f3c7a6d5443a17D021FA714FD93#code) |
| AuspexResolver | [`0x4BE05cbb9f9D527A80e0A812254b6E73F66Dbeda`](https://shannon-explorer.somnia.network/address/0x4BE05cbb9f9D527A80e0A812254b6E73F66Dbeda#code) |

## Tests

37 Forge tests, all passing:

```bash
pnpm --filter @auspex/contracts test
```

```
EscrowFactory.t.sol     7 passed
Escrow.t.sol           11 passed
AuspexResolver.t.sol   15 passed
SomniaConstants.t.sol   3 passed
Smoke.t.sol             1 passed
────────────────────────────────
37 passed · 0 failed
```

Coverage spans the full resolver state machine (`startResolution → onMetadata → onParsed → onJudgment`, including non-platform-caller reverts), the escrow lifecycle (`submitDelivery` / `resolve` / `claim` and their revert paths), and factory job creation.

## Future work

- Multi-vertical briefs beyond "delivered URL" — code review, data labeling, file deliverables judged by the same composition.
- Reputation: aggregate each address's release/refund history into an on-chain score agents can read before transacting.
- Configurable resolution policy per job — number of agent passes, confidence threshold, optional human appeal window.
- A dispute-stake mechanism so a losing party can escalate to a second, larger agent panel.
- Mainnet deployment once the contracts are audited.

## Builder

- **Hammed Ali Oyeleye** — Smart contracts, frontend, and bots — [GitHub](https://github.com/Alike001) · [Telegram](https://t.me/IamAlikeX)

## License

MIT — see [LICENSE](./LICENSE).
