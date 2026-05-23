# UX Spec — Auspex

> **Locked:** 2026-05-23. Pulls forward DESIGN.md from `research/somnia-agentathon-2026/10-ui-mining.md`. Every visual property in this document resolves to a token below — no exceptions.

---

## 1. Anchor products

| Anchor | Used for | Why |
|---|---|---|
| **Trigger.dev v3 dashboard** (cloud.trigger.dev) | Frontend #1 — Run-detail page layout, status pill conventions, real-time ticker behaviour | Job-lifecycle product with run + trace UI; Apache 2.0; productized OSS |
| **Langfuse trace view** (cloud.langfuse.com) | Frontend #2 — Trace timeline, LLM call card, reasoning trail | Direct match for "agent activity + reasoning"; MIT |
| **Documenso** (documenso.com) | Frontend #1 — Document-review-with-side-panel layout for Job Detail screen | Two parties + agreement mental model; AGPL-3.0 |
| **Linear** (linear.app) | Both — typography conventions, status pill colours, dense list density | Quiet typography gold standard; closed (replicate-only) |
| **Vercel deployments page** (vercel.com) | Frontend #2 — Row density + status colour conventions | Live event stream gold standard; closed (replicate-only) |

---

## 2. Design tokens (DESIGN.md — single source of truth)

Wire all of these into `app/styles/globals.css` as CSS variables AND into `tailwind.config.ts` `theme.extend.colors` so they're class-accessible.

### Palette (hex — literal values)

| Token | Hex | CSS var | Tailwind | Used for |
|---|---|---|---|---|
| `bg` | `#070D14` | `--auspex-bg` | `bg-bg` | Page background (deep teal-black) |
| `surface` | `#0F1A24` | `--auspex-surface` | `bg-surface` | Cards, panels |
| `surface-elevated` | `#15222F` | `--auspex-surface-elevated` | `bg-surface-elevated` | Modals, popovers, active row |
| `border` | `#1F2D3D` | `--auspex-border` | `border-border` | All borders + dividers |
| `border-strong` | `#2D4154` | `--auspex-border-strong` | `border-border-strong` | Focus ring base |
| `text-primary` | `#F4F6F7` | `--auspex-text-primary` | `text-text-primary` | Headings, body |
| `text-secondary` | `#95A8B6` | `--auspex-text-secondary` | `text-text-secondary` | Metadata, secondary copy |
| `text-muted` | `#5B7884` | `--auspex-text-muted` | `text-text-muted` | Labels, timestamps |
| `accent` | `#E9C46A` | `--auspex-accent` | `text-accent` / `bg-accent` | **ONLY** active verdict, primary CTA, "released" state |
| `success` | `#4ADE80` | `--auspex-success` | `text-success` | "Released" / "Paid" / "Completed" |
| `destructive` | `#EF4444` | `--auspex-destructive` | `text-destructive` | "Refunded" / "Failed" / "Disputed" |
| `info` | `#60A5FA` | `--auspex-info` | `text-info` | "Judging…" / "In progress" |
| `warning` | `#FBBF24` | `--auspex-warning` | `text-warning` | "Awaiting delivery" / "Pending" |

### Typography

| Role | Font | Weights | Used for |
|---|---|---|---|
| Display | Geist Sans | 600, 700 | H1 + H2 only — tight tracking `-0.02em` |
| Body | Geist Sans | 400, 500 | All body, buttons, inputs |
| Mono | Geist Mono | 400, 500 | Addresses, hashes, agent IDs, JSON, code blocks |

**Scale (px):** 11, 12, 14, 16, 18, 20, 24, 32, 40, 56
**Line-height:** 1.4 (body), 1.2 (display)
**Letter-spacing:** `-0.02em` (display), `0` (body), `0.04em` (ALL-CAPS labels)

### Spacing (Tailwind defaults are fine, but stick to this scale)

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96` — i.e. Tailwind `1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24`

### Radius

| Surface | Value | Tailwind |
|---|---|---|
| Buttons, pills, inputs | `6px` | `rounded-md` (override `--radius` to 6) |
| Cards, panels | `10px` | `rounded-[10px]` |
| Modals | `14px` | `rounded-[14px]` |
| Agent / avatar chip | `6px` | `rounded-md` — **NOT circular** |

### Motion

| Action | Spec |
|---|---|
| Button hover | `opacity-95 + translate-y-[-1px]`, 150ms ease-out |
| Row hover | `bg-surface-elevated`, 80ms ease-out |
| Focus ring | 2px `border-strong`, 1px offset, never `outline-none` alone |
| Status pulse (judging) | 1.2s sine, opacity 0.6 ↔ 1.0, on pill background |
| New feed row | `translate-y-[-8px] → 0 + opacity-0 → 1`, 200ms ease-out |
| Verdict reveal | Stagger fade-in reasoning lines, 80ms each |
| Page transition | None (instant) |

---

## 3. Banned Tailwind / patterns (project-specific)

- ❌ `from-purple-*`, `to-pink-*`, `from-violet-*`, `to-cyan-*`, `from-indigo-*` — any default gradient
- ❌ `font-sans` without explicit Geist `@import`
- ❌ `text-gray-*` as only body styling (use `text-text-primary`, `text-text-secondary`, `text-text-muted`)
- ❌ `rounded-xl shadow-md` cards — the shadcn-admin tell
- ❌ `rounded-full` on `AgentChip` (agents are square-with-radius)
- ❌ `flex-1` as primary spacing strategy
- ❌ Centred text-only hero on a gradient
- ❌ `Lorem ipsum`, `John Doe`, `jane@example.com`, `user@example.com`
- ❌ `picsum.photos`, `ui-avatars.com`, `randomuser.me` — agent identities use Boring Avatars derived from address
- ❌ Emoji-as-status (`✅ Done`) — use `StatusPill`
- ❌ Web3-gamer neon glows / heavy shadows
- ❌ Auto-playing audio / unsolicited notifications in v1

---

## 4. Route map

```
/                          → redirect → /jobs
/jobs                      Frontend #1 — Job feed
/jobs/new                  Frontend #1 — Post job
/jobs/[id]                 Frontend #1 — Job detail
/bots                      Frontend #2 — Bot dashboard
/api/bot-trigger           Server action — fires bot orchestrator
```

No marketing landing page in v1. The app itself is the landing — wallet connect lands you on `/jobs`.

---

## 5. Demo shape rule

Exactly two demos are shippable in v1:

1. **Human freelance flow (Frontend #1):** Demo viewer posts a $5 job → demo viewer (or pre-set freelancer account) submits a URL → agent composition runs → verdict + reasoning visible on `/jobs/[id]` → payout claimed.
2. **Bot dashboard (Frontend #2):** Pre-recorded canonical 60s plays by default on page load. A clearly labelled "Run live demo" button (top right of `/bots`) fires the bot orchestrator to run a real on-chain loop. The same UI renders both modes; a `PLAYBACK` pill is visible top right when playback is the source.

Anything beyond these two demos is out of v1.

---

## 6. Frontend #1 — Human freelance flow

### 6.1 Screen: `/jobs` (Job feed)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [AUSPEX]   Jobs   Bots                          [Connect Wallet ▼]      │ ← app shell
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Jobs                                                  [+ Post a job]    │ ← H1 + primary CTA
│  Agent-arbitrated escrow on Somnia. 1-block settlement.                  │ ← page subtitle
│                                                                          │
│  ┌────┬────────────────────────────────────────────────────────┐         │
│  │ ●  │  Fix the H1 typo on landing.example.com                 │  $5.00 │ ← JobCard row
│  │    │  ⬜ 0x7a…3f → ⬜ 0x9d…21    [Released] · 12s ago         │  ─────  │
│  ├────┼────────────────────────────────────────────────────────┼─────────┤
│  │ ◐  │  Make the hero section responsive at < 768px            │ $12.00  │
│  │    │  ⬜ 0xab…99 → ⬜ 0xcd…aa    [Judging…] · 2s ago          │  ─────  │
│  ├────┼────────────────────────────────────────────────────────┼─────────┤
│  │ ○  │  Match this Figma frame for the pricing block           │ $20.00  │
│  │    │  ⬜ 0x12…66 → ⬜ 0x34…77    [Awaiting delivery] · 5m ago │  ─────  │
│  └────┴────────────────────────────────────────────────────────┴─────────┘
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

Status circle on the left (`●`/`◐`/`○`) is a colour-coded square dot (NOT round), 8×8px. Mapped: success→`accent`, judging→`info`, awaiting→`warning`, failed→`destructive`.

Empty state: *"No jobs yet. Post the first one."* + primary CTA.

Loading state: 6 skeleton rows.

Error state: inline error banner above the list with "Retry" action.

### 6.2 Screen: `/jobs/new` (Post a job)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Back to jobs                                                          │
│                                                                          │
│  Post a job                                                              │
│  Lock funds against a natural-language brief.                            │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Brief                                                              │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │  Fix the H1 typo on https://landing.example.com so it reads  │  │  │
│  │  │  "Welcome" instead of "Wellcome".                            │  │  │
│  │  │                                                              │  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │  Deliverer wallet                                                   │  │
│  │  [ 0x...                                                       ]    │  │
│  │                                                                     │  │
│  │  Amount (STT)             Deadline                                  │  │
│  │  [ 5.00         ]         [ 2026-06-01T18:00 ]                      │  │
│  │                                                                     │  │
│  │  ─────────────────────────────────────────────────────────────────  │  │
│  │  Total locked: 5.00 STT  ·  Resolution budget: 0.36 STT (3 × 0.12) │  │
│  │                                                  [Post job ▶]      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

Validation:
- Brief: required, 20-1000 chars
- Deliverer: required, valid 0x address
- Amount: required, > 0, ≤ wallet balance - 0.36
- Deadline: required, > now + 5 min

Submit: writes brief to off-chain store, takes hash, calls `EscrowFactory.createJob(briefHash, briefURI, deliverer, deadline, { value: amount + 0.36 })`. Toast on success: *"Job posted. Brief hash 0x…ab12. Awaiting delivery."*

### 6.3 Screen: `/jobs/[id]` (Job detail)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Jobs                                                                  │
│                                                                          │
│  Fix the H1 typo on landing.example.com                                  │ ← H1 = brief excerpt (first 80 chars)
│  $5.00 locked · ⬜ 0x7a…3f → ⬜ 0x9d…21 · 2 mins ago                       │ ← metadata strip
│                                                                          │
│  [Released]                                            [Claim payout ▶] │ ← StatusPill + primary CTA (visible when applicable)
│                                                                          │
│  ┌──────────────────────────────────────┬─────────────────────────────┐  │
│  │  BRIEF                               │  REASONING                  │  │
│  │  ────────────────────────────────    │  ─────────────────────────  │  │
│  │                                      │  ◆ JSON API verified URL    │  │
│  │  Fix the H1 typo on https://         │    landing.example.com is   │  │
│  │  landing.example.com so it reads     │    reachable (200 OK)       │  │
│  │  "Welcome" instead of "Wellcome".    │                             │  │
│  │                                      │  ◆ Parsed page content      │  │
│  │  Posted by 0x7a…3f at 14:02:11       │    extracted H1: "Welcome"  │  │
│  │  Hash: 0xab12…cd34                   │                             │  │
│  │                                      │  ◆ Verdict: released        │  │
│  │  DELIVERED URL                       │    H1 reads "Welcome" —     │  │
│  │  ────────────────────────────        │    matches the brief.       │  │
│  │  https://landing.example.com         │                             │  │
│  │  [Preview ↗]                         │  Tx: 0xff21…8a99 ↗          │  │
│  │                                      │                             │  │
│  │  ┌──────────────────────────────┐    │                             │  │
│  │  │ [iframe preview of URL]      │    │                             │  │
│  │  │                              │    │                             │  │
│  │  └──────────────────────────────┘    │                             │  │
│  └──────────────────────────────────────┴─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

States:
- **Awaiting delivery** — Delivered URL panel shows empty state *"No delivery yet"* + (if viewer is deliverer) [Submit delivery] CTA
- **Delivered, judging** — Delivered URL panel shows iframe; Reasoning panel shows 3 placeholder rows with pulsing dots ("Verifying URL…", "Parsing content…", "Judging against brief…")
- **Released** — Reasoning panel fully populated; primary CTA = [Claim payout] (visible to deliverer only)
- **Refunded** — StatusPill = `destructive`; primary CTA = [Claim refund] (visible to client only)

Delivery submission modal (if viewer is deliverer):
```
┌────────────────────────────────────────┐
│  Submit delivery                       │
│                                        │
│  Delivery URL                          │
│  [ https://...                      ]  │
│                                        │
│  Resolution will fire immediately.     │
│  3 agent calls (~0.36 STT) will run.   │
│                                        │
│  [Cancel]            [Submit ▶]        │
└────────────────────────────────────────┘
```

---

## 7. Frontend #2 — Bot dashboard

### 7.1 Screen: `/bots`

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [AUSPEX]   Jobs   Bots                          [Connect Wallet ▼]      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Agent commerce                                  [Playback ●]            │ ← mode pill: PLAYBACK or LIVE
│  Two agents transacting via Auspex.              [▶ Run live demo]      │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ⬜ data-fetcher  →  ⬜ scraper                                       │  │ ← Active pair (AgentChips)
│  │  Brief: Scrape product names from https://example-shop.com         │  │
│  │                                                                     │  │
│  │  [json-api]──[parse-website]──[llm-judge]    [Released] · 1.4s     │  │ ← TraceTimeline horizontal
│  │     ●           ●               ●                                   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Recent transactions                                                     │
│  ┌────┬────────────────────────────────────────────────────────┬───────┐ │
│  │ ●  │ data-fetcher → scraper · scrape product names          │  0.5  │ │ ← BotFeedRow (new rows slide in from top)
│  │    │ [Released] · 1.4s · Tx 0xff…21 ↗                       │  STT  │ │
│  ├────┼────────────────────────────────────────────────────────┼───────┤ │
│  │ ●  │ data-fetcher → scraper · fetch headlines                │  0.3  │ │
│  │    │ [Released] · 1.2s · Tx 0xaa…99 ↗                       │  STT  │ │
│  ├────┼────────────────────────────────────────────────────────┼───────┤ │
│  │ ◐  │ data-fetcher → scraper · scrape prices                  │  0.5  │ │
│  │    │ [Judging…] · 0.8s · Tx 0xbc…11 ↗                       │  STT  │ │
│  └────┴────────────────────────────────────────────────────────┴───────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Last 60s: 12 jobs · 100% released · avg 1.3s settle              │  │ ← summary strip
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

States:
- **Playback mode** (default on page load): `PLAYBACK` pill visible; canonical 60s plays on loop; "Run live demo" button enabled
- **Live mode** (after button click): `LIVE` pill visible (warning yellow); bot orchestrator fires; real events stream from Shannon; button becomes "Stop live demo"
- **Empty state** (live mode, no events yet): *"Bots warming up… expect first transaction within 5 seconds."* + skeleton row
- **Error state** (live mode, orchestrator fails to spawn): inline error banner + "Retry" + "Switch to playback"

---

## 8. Signature components — full state specs

### 8.1 `AgentChip`

Visual: square 24×24px with 6px radius + 1px border + name beside it + optional online dot.

```
┌──┐
│⬜│ data-fetcher  0x7a…3f  ●
└──┘
```

- Background: deterministic hash → palette (NOT random)
- Border: `border`
- Name: `text-text-primary`, 14px
- Address: `text-text-muted`, 12px Geist Mono
- Online dot: `success` 6px, optional

States:

| State | Visual |
|---|---|
| Default | Square + name + address |
| Hover | Name underlined; tooltip shows full address + role |
| Focus | 2px ring `border-strong` around the square |
| Loading | Skeleton 24×24 + skeleton bar for name |
| Empty (unknown agent) | Square shows `?`; name = "Unknown agent"; muted |

### 8.2 `StatusPill`

7 colour variants. Pill height 22px. 6px radius. 8px horizontal padding. Uppercase, 11px, letter-spacing `0.04em`.

| Status | Background | Text |
|---|---|---|
| `released` | `accent` at 15% opacity | `accent` full |
| `paid` | `success` at 15% | `success` |
| `judging` | `info` at 15% | `info` + pulse |
| `awaiting` | `warning` at 15% | `warning` |
| `refunded` | `destructive` at 15% | `destructive` |
| `failed` | `destructive` at 15% | `destructive` |
| `playback` | `surface-elevated` | `text-secondary` |

States:
- Default: static
- Pulse (judging only): opacity 0.6 ↔ 1.0 on background, 1.2s sine
- Disabled: greyed text + reduced opacity 60%

### 8.3 `ReasoningTrace` ⭐ signature

Vertical timeline. Each entry has: a 6px diamond marker (`◆`) coloured by step status + a heading line + a body line + optional evidence link.

```
◆ JSON API verified URL
   landing.example.com is reachable (200 OK)

◆ Parsed page content
   extracted H1: "Welcome"

◆ Verdict: released
   H1 reads "Welcome" — matches the brief.
   Tx: 0xff21…8a99 ↗
```

States:
- Empty: *"No reasoning yet — judging in progress…"* + 3 skeleton diamonds + bars
- Loading per step: that step's diamond pulses; previous steps are filled
- Complete: all diamonds filled in their colours
- Error step: that diamond = `destructive` + body line shows error + [Retry] button

Stagger animation: each completed step fades in over 80ms.

### 8.4 `JobCard`

Used in `/jobs` feed. Row layout. Hover lifts background.

```
●  Fix the H1 typo on landing.example.com                            $5.00
   ⬜ 0x7a…3f → ⬜ 0x9d…21    [Released] · 12s ago                   ─────
```

States:
- Default: as above
- Hover: `bg-surface-elevated`, cursor pointer
- Focus: 2px ring + same elevated background
- Loading: full skeleton row
- Empty (across whole feed): *"No jobs yet. Post the first one."*

### 8.5 `BotFeedRow`

Denser JobCard variant for `/bots` recent transactions.

```
●  data-fetcher → scraper · scrape product names                      0.5
   [Released] · 1.4s · Tx 0xff…21 ↗                                   STT
```

States: same as JobCard. Additional state:
- New row slide-in: `translate-y-[-8px] → 0 + opacity 0 → 1`, 200ms ease-out

### 8.6 `DeliveryPreview`

iframe wrapped in a card. 320px min height. Fixed aspect ratio not enforced; loads `srcdoc` fallback if URL refuses framing.

States:
- Default: iframe loads
- Loading: skeleton with `Loading delivery preview…` text
- Error (frame-blocked or 4xx): *"Couldn't load preview"* + [Open in new tab ↗] link
- Empty (no delivery yet): *"No delivery yet"* + (if viewer is deliverer) `[Submit delivery]` CTA

### 8.7 `TraceTimeline`

Horizontal pipe of 3 nodes (one per agent step) connected by lines. Each node is a 24px circle (`rounded-full` ALLOWED here because these are PROCESS steps, not identities) with the step label below.

```
[json-api]──[parse-website]──[llm-judge]
   ●           ●               ◐         ← pulse on the active step
```

States:
- Pending: node = empty circle, label muted
- Active: node = `info` fill + pulse
- Success: node = `accent` fill (for `llm-judge` final node) or `success` (for intermediate)
- Failed: node = `destructive` + step label red

### 8.8 Buttons (shadcn restyled)

| Variant | Background | Text | Hover | Used for |
|---|---|---|---|---|
| `default` (primary) | `accent` | `bg` | opacity 0.95 | THE primary CTA — Post job, Run live demo, Claim payout |
| `secondary` | transparent | `text-primary` | `bg-surface-elevated` | Cancel, Back, secondary actions |
| `ghost` | transparent | `text-secondary` | `text-primary` | Tertiary inline actions |
| `destructive` | `destructive` | `bg` | opacity 0.95 | Refund flows only |

Sizes: `sm` (h-8), `md` (h-9), `lg` (h-10). Use `md` as default.

States: hover (above), focus (ring), active (transform translate-y-0), disabled (60% opacity + cursor-not-allowed), loading (label fades to spinner).

---

## 9. Copy strings (verbatim — use these, do not paraphrase)

### Headers / titles

- App title (tab + nav): `Auspex`
- Tagline: `Agent-arbitrated escrow on Somnia`
- /jobs H1: `Jobs`
- /jobs subtitle: `Agent-arbitrated escrow on Somnia. 1-block settlement.`
- /jobs/new H1: `Post a job`
- /jobs/new subtitle: `Lock funds against a natural-language brief.`
- /jobs/[id] H1: Brief excerpt (first 80 chars, ellipsis after)
- /bots H1: `Agent commerce`
- /bots subtitle: `Two agents transacting via Auspex.`

### CTAs

- `Connect Wallet`
- `+ Post a job`
- `Post job`
- `Submit delivery`
- `Claim payout`
- `Claim refund`
- `Run live demo`
- `Stop live demo`
- `View on explorer ↗`
- `Open in new tab ↗`

### Status pill labels (uppercase enforced)

- `RELEASED`, `REFUNDED`, `JUDGING…`, `AWAITING DELIVERY`, `PAID`, `FAILED`, `PLAYBACK`, `LIVE`

### Toast messages

- Post success: `Job posted. Awaiting delivery.`
- Delivery success: `Delivery submitted. Resolution running.`
- Claim success: `Payout claimed.`
- Refund success: `Refund claimed.`
- Tx error generic: `Transaction reverted. Check the console for details.`
- Wallet not connected: `Connect your wallet to continue.`

### Empty states

- /jobs empty: `No jobs yet. Post the first one.`
- /jobs/[id] no delivery: `No delivery yet.`
- /bots live waiting: `Bots warming up… expect first transaction within 5 seconds.`
- ReasoningTrace pending: `No reasoning yet — judging in progress…`

### Error states

- Preview load failed: `Couldn't load preview.`
- Resolution failed: `Resolution failed. Check the transaction on the explorer.`
- Wallet rejected: `Wallet rejected the transaction.`

---

## 10. Micro-interactions

| Interaction | Spec |
|---|---|
| Page load `/jobs` | Skeleton rows render immediately; live data fades in over 120ms once first read completes |
| Click `+ Post a job` | Modal NOT used — pushes to `/jobs/new` (full page is better for the form length) |
| Submit job tx | Button label morphs to `Posting…` + spinner; on success, toast + redirect to `/jobs/[id]` |
| Resolution running | TraceTimeline nodes pulse one-at-a-time as each agent callback arrives; toast `Resolution running.` (auto-dismissed in 4s) |
| Verdict lands | ReasoningTrace stagger-reveal each line, 80ms apart; primary CTA reveals once final reasoning line is shown |
| Live bot demo button click | Button label morphs to `Starting bots…`; after first JobCreated event, label becomes `Stop live demo`; `LIVE` pill turns warning-yellow |
| Switch playback↔live | Crossfade the feed area over 200ms; new mode pill swap is instant |
| Block height tick | Tiny dot in the bottom-right of the app shell pulses every block (text: `Block #1234567`) — gives a heartbeat |

---

## 11. Accessibility

- All interactive elements have visible focus ring (NEVER `outline-none` without replacement)
- Buttons have explicit `aria-label` where icon-only
- `StatusPill` text colour passes WCAG AA against its background (verified per pair in §2)
- iframe previews include `title` attribute
- Toast notifications include `role="status"` + screen-reader-only text for status changes
- All form fields have `<label>` associations (NO placeholder-only labels)

---

## 12. Responsive behaviour (v1 = desktop-first)

- All screens designed at 1440×900 desktop
- `< 1024px`: layout collapses (side panels stack); functional but unpolished
- `< 768px`: mobile is **out of scope for v1 polish**. Forms work, feed works, but visual hierarchy degrades
- DESIGN.md token wiring is responsive-ready; mobile polish is v2

---

## 13. Interaction-states checklist (must verify per component)

For each signature component, the following states MUST be implemented before story is "Done":

- [ ] Default
- [ ] Hover
- [ ] Focus (keyboard)
- [ ] Active (pressed)
- [ ] Disabled
- [ ] Loading / skeleton
- [ ] Empty
- [ ] Error

Story acceptance criteria include explicit gherkin scenarios for each of these where applicable.

---

## 14. Asset list

| Asset | Source | Used for |
|---|---|---|
| Geist Sans (variable) | npm `geist` package | Display + body |
| Geist Mono (variable) | npm `geist` package | Mono |
| App favicon | Custom — `auspex` letterform in `#E9C46A` on `#070D14` | Browser tab + PWA |
| OG image | Single 1200×630 PNG: dark bg + auspex letterform + tagline | Social previews (Vercel auto-generates from `/opengraph-image.tsx`) |
| Boring Avatars | npm `boring-avatars` | Agent chip backgrounds (deterministic per address) |

No stock photography. No iconography beyond Lucide icons (default in shadcn/ui).
