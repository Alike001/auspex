# Story — bots-dashboard-page

**Epic:** Epic 4 (closing)
**Depends on:** `story-trace-timeline-component`, `story-bot-feed-row-component`, `story-playback-engine`, `story-somnia-watch-stream`
**Estimated:** 1 day
**Story slug:** `story-bots-dashboard-page`

## Goal

Implement `/bots` route per ux-spec §7. Renders the "Active pair" card with TraceTimeline + the "Recent transactions" list of BotFeedRows + the summary strip. Defaults to playback mode on page load. "Run live demo" button switches to live mode and fires the orchestrator via `/api/bot-trigger`.

## Acceptance criteria (BDD)

```
Given I navigate to /bots
When the page loads
Then it starts in playback mode
And the `PLAYBACK` pill is visible top right
And the canonical 60s sequence begins playing immediately
And the "Run live demo" button is enabled

Given playback frames are emitting
When a JobCreated frame arrives
Then a new BotFeedRow slides in at the top of "Recent transactions"

Given JobResolved frame arrives
When emitted
Then the corresponding BotFeedRow's status pill updates to "RELEASED" or "REFUNDED"
And the Active Pair card's TraceTimeline shows all 3 nodes complete

Given AgentStep frame arrives during playback
When emitted
Then the Active Pair card's TraceTimeline updates the matching node (pending → inProgress → success/error)

Given I click "Run live demo"
When the button is clicked
Then the button label changes to "Starting bots…" with a spinner
And a POST is sent to /api/bot-trigger
And on success, the mode pill changes to `LIVE` (warning yellow)
And the button label becomes "Stop live demo"
And the event source switches from playback to watchAuspexEvents
And the feed continues without flicker (crossfade ≤ 200ms)

Given live mode is active
When I click "Stop live demo"
Then the orchestrator is signaled to stop via /api/bot-trigger (DELETE)
And the mode pill returns to `PLAYBACK`
And the playback engine resumes

Given the summary strip
When events are flowing
Then "Last 60s" stats update in real time: count of jobs, % released, average settle time

Given an error from /api/bot-trigger
When the orchestrator fails to spawn
Then a toast renders: "Couldn't start the live demo. Staying in playback."
And mode stays PLAYBACK
```

## File modification map

- `app/app/bots/page.tsx` — NEW — server shell
- `app/app/bots/BotsDashboard.tsx` — NEW — client component, event-stream consumer
- `app/app/bots/ActivePairCard.tsx` — NEW — the highlight card with the TraceTimeline
- `app/app/bots/RecentTransactionsList.tsx` — NEW — virtualized list of BotFeedRows (last 20 visible)
- `app/app/bots/SummaryStrip.tsx` — NEW — bottom-summary stats
- `app/app/api/bot-trigger/route.ts` — NEW — POST starts orchestrator child process; DELETE stops it
- `app/components/app-shell/Nav.tsx` — UPDATE — confirm "Bots" link is present (it is from story-rainbowkit-wallet)

## Shell verification

```bash
cd app
pnpm typecheck
pnpm lint
pnpm build
pnpm dev &
sleep 5

# Page exists and is playback-mode by default
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/bots   # 200
curl -s http://localhost:3000/bots | grep -E "Agent commerce|Run live demo|PLAYBACK"

# API exists
curl -s -X POST http://localhost:3000/api/bot-trigger | grep -E "ok|started|error"
curl -s -X DELETE http://localhost:3000/api/bot-trigger | grep -E "ok|stopped"

kill %1
```

## Out of scope

- ❌ Filtering / search of recent transactions (v2)
- ❌ Per-row drill-down modal (v2)
- ❌ User-facing playback controls (pause / scrub) — playback just runs
- ❌ Sound effects on JobResolved (definitely not in v1; the spec says no auto-audio)
