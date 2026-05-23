# PRD — Auspex

> **Project:** Auspex
> **Hackathon:** Somnia Agentathon 2026 (Encode Club × Somnia Network)
> **Submission deadline:** 2026-06-10 · **Finale:** 2026-06-11 17:00 GMT+1
> **Builder:** Hammed Ali Oyeleye (Alike001)
> **Spec built:** 2026-05-23

---

## 1. Goal

Auspex is an **agent-arbitrated escrow primitive** on Somnia. Two parties — whether humans, AI agents, or one of each — lock funds against a natural-language work agreement. When the work is delivered (a URL, repo, or file), a Somnia Agent composition reads the delivery, judges it against the brief, and atomically releases payment to the provider or refunds the client. The verdict and reasoning ship on-chain in the same block.

For a judge with 20 seconds to care: **Auspex is Kleros in one block. The LLM is the juror. The reasoning is on-chain. Two AI agents can transact through it with no humans in the loop.**

---

## 2. One-line pitch

> Agent-arbitrated escrow on Somnia — settle a work dispute in one block, with the LLM's reasoning on-chain.

---

## 3. Sponsor-native fit

Auspex composes Somnia's three base agents (JSON API Request, LLM Parse Website, LLM Inference) in a single transaction inside the Agent Platform's validator-consensus path, with Reactivity dispatching the verdict in the same block. The product is impossible on any other L1 today: it requires both a deterministic LLM in consensus and HTTP fetching as a consensus operation. Direct fit with George Walker's R&D-blessed "Sphinx" pattern (LLM judges a persuasive case) and the Demo Engineer JD's "autonomous agents coordinating onchain" and "agent-to-agent interactions" bullets.

---

## 4. Target users

| User | Use case | v1 demo coverage |
|---|---|---|
| Freelance client | Hires a freelancer for a small web task; wants escrow without Upwork's 5-25% fee or human-dispute lag | ✅ Frontend #1 — human freelance flow |
| Freelance provider | Wants payment certainty for small jobs that traditional platforms don't service economically | ✅ Frontend #1 |
| **AI agent (commissioner)** | Needs another agent to perform a task; wants on-chain settlement without a trusted broker | ✅ Frontend #2 — two-bot dashboard |
| **AI agent (provider)** | Offers a service to other agents; wants automatic payout on verifiable delivery | ✅ Frontend #2 |
| DAO grant admin | Disburses grants against natural-language milestones | ❌ v2 vertical (named in PRD §10) |

---

## 5. Demo moment

5-step judge walkthrough. No jargon until step 3.

1. **A client posts a $5 job:** *"Fix the typo in the H1 of `landing.example.com` so it reads 'Welcome' instead of 'Wellcome'."* Brief locked on-chain. Funds locked on-chain.
2. **A freelancer accepts and delivers a URL** to the fixed page within 30 seconds.
3. **A Somnia Agent composition runs in one transaction:** JSON API Request verifies the URL is reachable → LLM Parse Website extracts the H1 → LLM Inference judges whether the H1 matches the brief, returns a verdict (`released` / `refunded`) and a reasoning string.
4. **The verdict lands in the same block.** Funds flow to the freelancer. The reasoning string ("H1 reads 'Welcome' — matches brief") is permanent on-chain audit.
5. **Then the bot demo fires.** Two AI agents — a data-fetcher and a scraper — execute the same flow with no human input. Twelve agent-to-agent jobs complete in 60 seconds. The dashboard streams each as it happens.

---

## 6. The wow moment

> *Two AI agents transact a real economic exchange, on-chain, with an LLM as the arbiter — and the entire reasoning trail is verifiable on a block explorer.*

A judge remembers this 10 minutes later because it is **the JD bullet** ("agent-to-agent interactions") made literal.

---

## 7. Success metrics

| Metric | Target | How measured |
|---|---|---|
| Contract test coverage | ≥ 30 Forge tests passing | `forge test -vvv` |
| Agent-call success rate on Shannon testnet | ≥ 90% across 50 demo runs | Receipt audit + on-chain `RequestFinalized` events |
| Job settlement latency | ≤ 1 block (≤ 2s on Shannon) | Block-number diff between `JobDelivered` and `JobResolved` |
| Bot demo throughput | 12 agent-to-agent jobs in 60s on the live demo button | Demo video + live click during finale |
| Demo video clarity | A non-technical viewer understands the loop in 90s | Pre-finale review with 1-2 non-Web3 friends |
| Frontend Lighthouse score (desktop) | ≥ 90 perf, ≥ 95 accessibility | Lighthouse CI on Vercel preview |

---

## 8. Judging-criteria → feature mapping

| Criterion | How Auspex maxes it |
|---|---|
| **Functionality** | 2 working frontends + ≥ 30 Forge tests + visible on-chain state changes in every demo step |
| **Agent-First Design** | Bot-to-bot dashboard is the maximum form. 3 base agents composed in a single transaction. The LLM IS the arbiter — not a tool inside the system. |
| **Innovation & Technical Creativity** | "Agent-arbitrated escrow with on-chain reasoning" is a new product category. Multi-agent compose in one tx with same-block settlement is impossible on any other L1. |
| **Autonomous Performance** | Bot-to-bot loop runs with zero human action between any state transitions. Reactivity drives the resolution callback. The demo video can play continuously. |

---

## 9. Hire-prize alignment — "Why this person should be on the Somnia team"

Demo Engineer / DevRel JD bullets Auspex demonstrates verbatim:

- ✅ **Autonomous agents coordinating onchain** → bot-to-bot demo runs 12 commerce loops with no human input
- ✅ **Agent-to-agent interactions** → literal headline of v1; data-fetcher agent commissions scraper agent via Auspex
- ✅ **Prediction-market resolvers** → identical resolver tech, redirected to a non-gambling product surface (escrow). Demonstrates ability to identify and apply the resolver pattern to multiple verticals.
- ✅ **Polished reference implementations** → 2 frontends + clean Solidity + 30+ Forge tests + Vercel deploy + demo video

Builder side-channel: opens 1-2 small PRs on `Somnia-Network/*` repos during week 1 (non-blocking; see Epic 6).

---

## 10. In-scope vs Out-of-scope

### ✅ In scope for v1 (this hackathon)

- `EscrowFactory.sol` + `Escrow.sol` deployed to Shannon testnet with verified addresses
- 3-agent composition (JSON API → LLM Parse Website → LLM Inference) in `resolve()` callback
- Reactivity dispatch for same-block settlement
- ≥ 30 Forge tests
- **Frontend #1** — human freelance flow (Next.js 15 App Router + TypeScript + Tailwind v4 + shadcn/ui)
- **Frontend #2** — two-bot dashboard with live agent feed + pre-recorded playback + live "run demo" button
- Bot scripts (Node.js + viem): data-fetcher + scraper
- DESIGN.md tokens enforced; signature components built (AgentChip, StatusPill, ReasoningTrace, JobCard, BotFeedRow, DeliveryPreview, TraceTimeline)
- Demo video (~2 min) + README + submission package
- Vercel deploy of both frontends from a single Next.js app

### ❌ Out of scope for v1 (named explicitly as **v2 / future work**)

- Reputation NFT graph (LLM-judged quality scores building portable on-chain reputation)
- Multi-persona LLM jury (3 personas vote in threshold consensus)
- Competitive submissions / Code4rena pattern (N freelancers compete on one brief)
- **DAO grant disbursement vertical** (same primitive, grant admin product wrapper)
- Full TypeScript SDK (v1 ships a thin client wrapper; full SDK is v2)
- Full mobile responsive polish (desktop demo first; mobile good-enough)
- Auth beyond wallet connect (no email login, no social, no profiles)
- Multi-network deployment (Shannon testnet only)
- Programmatic onboarding for real freelancers (this is a primitive + reference apps, not a marketplace launch)

The README's "Future work" section will name these explicitly so judges see the roadmap without us building it.

---

## 11. Dependencies

| Dependency | Status | Risk |
|---|---|---|
| Shannon testnet uptime | Stable per sponsor docs | Low |
| Agent IDs (JSON API, LLM, Parse Website) | Public, used in `Kali-Decoder/Somnia-Agentic-examples` | Low |
| Agent call budget | 0.12 STT per call; reactivity contract holds ≥ 32 SOMI | Low — testnet faucet covers |
| Vercel free-tier limits | Frontend traffic during demo well within limits | Low |
| Builder available time | Full-time 3 weeks, no other major project | Medium — AI Video Cutter Stage 1 v1 target 2026-06-08 collides; mitigation = AI Video Cutter parked or compressed |
| Solidity-beginner ramp | First Solidity-heavy build in public | Medium — story sizing 0.5-1 day each; Cursor / Claude Code assist available; Kali-Decoder starter cloned |

---

## 12. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| LLM verdict non-determinism on edge briefs | Medium | Use `inferString` with `allowedValues = ["released", "refunded"]` (constrained output). Threshold consensus mode if needed. |
| Agent call returns insufficient_budget receipts | Medium | Send +0.30 STT buffer above `getRequestDeposit()`; excess refunds. Documented in `sdk-snippets.md`. |
| Live demo button hits Shannon downtime during judging | Low | Pre-recorded 60s playback ALWAYS runs. Live button is bonus. |
| Frontend build slips past Jun 9 | Medium | Week 3 has Jun 9-10 reserved as buffer. Frontend #1 ships first (Week 2). Frontend #2 is the show-stopper but can degrade to "playback only" if necessary. |
| Builder hits a Solidity blocker | Medium | `Kali-Decoder/Somnia-Agentic-examples` provides a working reference for every agent call. Cursor / Claude Code on standby. Telegram group has DevRel response. |
| Submission portal confusion (Encode vs DoraHacks) | Low | Confirm submission portal during Thu May 29 "How to win a hackathon" workshop. |

---

## 13. Open questions (resolve before / during build)

1. Submission portal — confirmed during May 29 workshop or via Telegram before Jun 5
2. Live demo button vs pre-recorded — both ship; default playback runs unless judge clicks "Run live"
3. Exact bot demo brief catalogue — finalize during Week 1 (recommend: 3 brief variants for variety)
4. Whether to open-source the bot scripts as a separate `auspex-bots` package — recommended yes, ships in same repo as `bots/`

---

## 14. README anchor (for `portfolio-readme-writer` at submission time)

Must include:
- Title + one-line pitch
- Live demo link (Vercel)
- 90-second demo video link
- Architecture diagram (export from `architecture.md`)
- Deployed contract addresses (Shannon testnet, with explorer links)
- "Run the bot demo" instructions (one CLI command)
- Forge test results (`forge test -vvv` output)
- Future work section (the v2 list from §10 above)
- Team / builder section (solo — Hammed Ali Oyeleye)
- License (MIT recommended — primitive philosophy)

---

## 15. Stakeholders

| Role | Name | Contact |
|---|---|---|
| Builder | Hammed Ali Oyeleye (Alike001) | github.com/Alike001 · @IamAlikeX on Telegram |
| Sponsor R&D | George Walker (Improbable Applied AI / Somnia Agents) | Via Encode Club Telegram |
| Programme operator | Encode Club | Programme page + Telegram (https://t.me/+XHq0F0JXMyhmMzM0) |
| Reviewer (PR audits) | `sahil-pr-audit` skill | Automated |

---

## 16. Approvals

- ✅ Wedge approved by builder (2026-05-23)
- ✅ Framing locked via SCAMPER (R + M + E)
- ✅ UI anchors locked (Trigger.dev + Langfuse + Documenso)
- ✅ Framework locked (Next.js 15 + TS + Tailwind v4 + shadcn/ui)
- ⏳ Spec set approval — pending builder review of this PRD + architecture + ux-spec + epics + stories
- ⏳ Orchestrator launch — gated on spec set approval
