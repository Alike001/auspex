# Epics — Auspex

> **Locked:** 2026-05-23. Orchestrator reads this file + every `stories/story-*.md` to spawn build agents.

---

## Sprint window

- **Start:** 2026-05-24
- **Submission:** 2026-06-10
- **Finale:** 2026-06-11 17:00 GMT+1
- **Total:** 18 calendar days, 17 effective build days

## Week split (recommended ordering)

| Week | Dates | Focus | Epics |
|---|---|---|---|
| Week 1 | May 24 – May 30 | Contracts + agent composition end-to-end on testnet. ONE hardcoded job flows from post → deliver → judge → payout via a CLI. No UI yet. | Epic 1 + start Epic 6 |
| Week 2 | May 31 – Jun 6 | Frontend #1 (human freelance flow) + Bot scripts (parallel) | Epic 2 + Epic 3 |
| Week 3 | Jun 7 – Jun 10 | Frontend #2 (bot dashboard) + polish + tests to ≥ 30 + demo video + README + submission | Epic 4 + Epic 5 |
| Buffer | Jun 9 – Jun 10 | Reserved for finale-week issues, demo video re-shoots | — |

## Epics overview

| # | Title | Goal | Stories | Duration | Depends on |
|---|---|---|---|---|---|
| 1 | Contract foundation + agent composition | Working end-to-end on Shannon testnet via CLI: post → deliver → 3-agent compose → verdict → payout | 7 | Week 1 (7 days) | None |
| 2 | Frontend #1 — Human freelance flow | Full client/freelancer escrow UX wired to deployed contracts | 6 | Week 2 (4-5 days) | Epic 1 |
| 3 | Bot scripts (data-fetcher + scraper) | Two Node.js bots that transact via Auspex with no human input | 4 | Week 2 (parallel, 2-3 days) | Epic 1 |
| 4 | Frontend #2 — Bot dashboard | Live + playback bot demo with run-live button | 5 | Week 3 (3 days) | Epic 2 + Epic 3 |
| 5 | Forge tests + polish + demo + submission | ≥ 30 tests passing, demo video shot, README, deploy URL pinned, submission landed | 5 | Week 3 (3 days) | Epic 4 |
| 6 | Side-channel hire signal — Somnia repo PRs | 1-2 small accepted PRs on `Somnia-Network/*` | 2 | Week 1-2 (background, optional) | None |

Total: **6 epics, 29 stories.**

---

## Epic 1 — Contract foundation + agent composition

**Goal:** A working end-to-end flow on Shannon testnet: create job → submit delivery → 3-agent compose resolves it → release/refund → claim. Triggered via a single CLI script. No UI yet. Forge tests cover happy path + 5+ edge cases.

**Business value:** This is the moat. Without working agent composition on testnet, there is no demo. Without this epic, Auspex is a wireframe.

**Definition of done:**
- All contracts compile under `^0.8.24` (and `0.8.30` for reactivity) with zero warnings
- All contracts deploy to Shannon testnet; addresses recorded in `contracts/deployments/shannon.json`
- `pnpm run demo:e2e` runs a complete post → deliver → resolve → claim loop in < 60s
- ≥ 15 Forge tests passing
- AuspexResolver holds ≥ 32 SOMI (per reactivity requirement)

**Dependencies:** None — Epic 0 of the sprint.

**Stories (in order):**
1. `story-hardhat-foundry-scaffold` — Repo + foundry + hardhat + Shannon network config
2. `story-vendor-isomnia-interface` — Vendor `ISomniaAgents.sol` from Kali-Decoder examples
3. `story-escrow-factory-skeleton` — EscrowFactory + Escrow with state machine (no agent calls yet)
4. `story-resolver-json-api-step` — AuspexResolver step 1: JSON API call wired
5. `story-resolver-parse-website-step` — AuspexResolver step 2: LLM Parse Website call wired
6. `story-resolver-llm-judge-step` — AuspexResolver step 3: LLM Inference verdict + applyVerdict callback
7. `story-cli-e2e-demo` — CLI script that runs the full happy path on Shannon

---

## Epic 2 — Frontend #1 (Human freelance flow)

**Goal:** A judge can connect a wallet, post a job, submit a delivery from a second wallet, and see the verdict + reasoning trail on screen — all live against Shannon testnet.

**Business value:** This is the "warm" demo. Relatable. Easy to follow. Earns Functionality + UX polish points.

**Definition of done:**
- `/jobs`, `/jobs/new`, `/jobs/[id]` routes implemented
- All signature components built and used (AgentChip, StatusPill, ReasoningTrace, JobCard, DeliveryPreview)
- All interaction states from ux-spec §13 implemented for signature components
- Wallet connects via RainbowKit
- All writes execute against deployed Shannon contracts
- Lighthouse desktop perf ≥ 85, accessibility ≥ 95
- Vercel preview deploy passes

**Dependencies:** Epic 1 contracts deployed.

**Stories (in order):**
1. `story-nextjs-scaffold` — Next.js 15 + Tailwind v4 + shadcn/ui + Geist + DESIGN.md tokens wired
2. `story-rainbowkit-wallet` — RainbowKit + wagmi + viem + Shannon chain config
3. `story-signature-components` — AgentChip + StatusPill + JobCard + DeliveryPreview built with all states
4. `story-reasoning-trace-component` — ReasoningTrace component with stagger animation and all states
5. `story-jobs-feed-page` — `/jobs` route with live event subscription
6. `story-jobs-new-page` — `/jobs/new` form + post-job tx
7. `story-jobs-detail-page` — `/jobs/[id]` with brief, delivery, reasoning, claim flow

(Note: 7 stories total — one more than the table summary; the signature-components story split into two because ReasoningTrace alone is half a day's work.)

---

## Epic 3 — Bot scripts (parallel with Epic 2)

**Goal:** Two Node.js scripts (`data-fetcher` and `scraper`) transact via Auspex with no human input. A third orchestrator script runs them in a loop. The pair can be invoked from a single `pnpm bots:demo` command.

**Business value:** Powers Frontend #2's "Run live demo" button. Without these scripts, the show-stopper bot demo collapses to playback-only.

**Definition of done:**
- Both bots run as Node processes
- One full job cycle completes in < 10s (post → deliver → resolve → claim) on testnet
- Orchestrator runs N cycles in a row, configurable via `--count`
- All bot keys read from `.env` (never committed)
- Structured JSON logs to stdout for downstream consumption

**Dependencies:** Epic 1 contracts deployed.

**Stories:**
1. `story-data-fetcher-bot` — Posts jobs from a brief catalogue
2. `story-scraper-bot` — Listens for jobs, performs scrape, submits delivery, claims payout
3. `story-bot-orchestrator-cli` — Spawns both bots, runs N cycles, structured logs
4. `story-canonical-60s-recording` — Run the orchestrator once, capture 12 jobs into `app/public/demo/canonical-60s.json`

---

## Epic 4 — Frontend #2 (Bot dashboard)

**Goal:** Default playback mode plays the canonical 60s on page load. "Run live demo" button fires the orchestrator and streams real events. Switching modes is seamless.

**Business value:** The show-stopper. The bot dashboard is the moment a judge says "wait, no humans?"

**Definition of done:**
- `/bots` route implemented
- Playback mode plays the canonical 60s on loop, with `PLAYBACK` pill visible
- "Run live demo" button starts orchestrator via `/api/bot-trigger` server action
- Live mode renders real Shannon events with `LIVE` pill (warning yellow)
- TraceTimeline + BotFeedRow components built and used
- Summary strip (last 60s stats) updates in real time
- Crossfade between modes works without flicker

**Dependencies:** Epic 2 (shared design system), Epic 3 (bots).

**Stories:**
1. `story-trace-timeline-component` — Horizontal 3-node TraceTimeline with all states
2. `story-bot-feed-row-component` — Denser feed row with slide-in animation
3. `story-playback-engine` — `app/lib/playback.ts` that advances frames against `performance.now()`
4. `story-bots-dashboard-page` — `/bots` route with playback default + run-live button
5. `story-somnia-watch-stream` — Live event subscription wrapping `@somnia-chain/reactivity` SDK

---

## Epic 5 — Forge tests + polish + demo video + submission

**Goal:** Cross the finish line. Tests ≥ 30. Demo video shot. README polished. Vercel URL pinned. Submission landed before Jun 10 23:59 GMT+1.

**Business value:** A great product without a great submission package loses to a decent product with a great package. This epic IS the score.

**Definition of done:**
- `forge test -vvv` reports ≥ 30 tests passing
- Demo video uploaded (Loom or YouTube unlisted), link in README
- README has all sections from PRD §14
- Final Shannon addresses committed to `contracts/deployments/shannon.json`
- Vercel production deploy URL is the canonical demo link
- Encode submission form filled with all required fields
- Telegram announcement post drafted (for posting after submission)

**Dependencies:** Epics 1-4 complete.

**Stories:**
1. `story-top-up-forge-tests` — Add edge case tests to reach 30+
2. `story-final-deploy-shannon` — Final contract deploy + verified addresses
3. `story-vercel-production-deploy` — Production deploy + custom subdomain if available
4. `story-demo-video-shoot-edit` — Record 2-min demo following the 30-60-30 structure
5. `story-readme-and-submission` — README via portfolio-readme-writer + Encode submission form

---

## Epic 6 — Side-channel hire signal (optional, non-blocking)

**Goal:** Open 1-2 small, accepted PRs on `Somnia-Network/*` repos during Week 1. Signals "I'm already part of the ecosystem" to the Demo Engineer hiring funnel.

**Business value:** Optional. Doesn't affect the hackathon submission but materially affects the hire prize outcome. Sponsor R&D welcomed open-source contributions on stage at kickoff.

**Definition of done:**
- 1-2 PRs opened during Week 1 (May 24-30) on `Somnia-Network/*` repos
- PRs are small (typo fixes, doc improvements, missing test coverage, broken link fixes)
- PRs are tagged with a 1-line introduction mentioning Auspex (link to the WIP repo)
- PRs are NOT blocking the hackathon submission — strictly background work

**Dependencies:** None.

**Stories:**
1. `story-somnia-repo-scan` — Scan `Somnia-Network/*` for accessible PR opportunities
2. `story-open-first-somnia-pr` — Open the first PR (typo / docs / link fix)

(Story 2 of this epic is optional; spawning depends on whether story 1 surfaces good candidates.)

---

## Sequencing rules

- **Epic 1 must complete before Epic 2 starts.** Frontend has nothing to talk to without contracts.
- **Epic 2 and Epic 3 can run in parallel** once Epic 1 contracts are deployed (different domains).
- **Epic 4 needs Epic 3 complete** for the canonical playback recording (Epic 3 story 4 produces the recording asset that Epic 4 consumes).
- **Epic 5 starts when Epic 4 is "demoable"** even if not perfectly polished — polish folds into Epic 5.
- **Epic 6 runs throughout** as background work, never blocks the critical path.

---

## Risk register per epic

| Epic | Top risk | Mitigation |
|---|---|---|
| 1 | LLM verdict non-determinism on edge briefs | `allowedValues = ["released","refunded"]` constrained output (per `sdk-snippets.md` §3) |
| 1 | Agent call `insufficient_budget` | Send +0.30 STT buffer above `getRequestDeposit()` per ADR-006 |
| 2 | Solidity-beginner ramp on Next.js + TS | Story sizing 0.5-1 day each; Cursor / Claude Code assist available |
| 3 | Free scrape targets become unavailable | Brief catalogue uses 3 different domains; orchestrator skips failed bots and tries next brief |
| 4 | `somnia_watch` WebSocket flakiness during demo | Polling fallback in `app/lib/watch.ts`; playback mode is always available |
| 5 | Demo video re-shoots eat time | Storyboard locked in `ux-spec.md` §5; record from a clean state; one-take attempts |
| 6 | PRs not accepted in time | Non-blocking — even an open PR is signal; merge is bonus |
