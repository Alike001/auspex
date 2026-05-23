# Story — signature-components

**Epic:** Epic 2
**Depends on:** `story-nextjs-scaffold`
**Estimated:** 1 day
**Story slug:** `story-signature-components`

## Goal

Build the core signature components: `AgentChip`, `StatusPill`, `JobCard`, `DeliveryPreview`. Each must implement ALL interaction states from ux-spec §13. Each component has a `.stories.tsx` file (Ladle or simple Next.js demo route) that renders every state for manual verification. ReasoningTrace and TraceTimeline ship in separate stories.

## Acceptance criteria (BDD)

```
Given the AgentChip component
When rendered with `address="0x7a8f...3f99" name="data-fetcher"`
Then it renders a 24×24px square with `rounded-md` (NOT `rounded-full`) and a deterministic Boring Avatar background
And the name "data-fetcher" appears beside it in `text-text-primary` 14px
And the address shortform "0x7a…3f" appears in `text-text-muted` 12px Geist Mono

Given AgentChip hover
When the mouse hovers over an AgentChip
Then the name receives `underline`
And a tooltip appears with the full address

Given AgentChip loading state
When rendered with `loading={true}`
Then a 24×24 skeleton square + skeleton bar render in place of identity

Given the StatusPill component
When rendered with `status="released"`
Then the background is `bg-accent/15` and the text is `text-accent`
And the label is `RELEASED` (uppercase enforced)

Given StatusPill with status="judging"
When rendered
Then the background pulses opacity 0.6 ↔ 1.0 on a 1.2s sine cycle

Given the JobCard component
When rendered with full props
Then it renders the layout from ux-spec §6.1: status dot, brief excerpt, AgentChip-to-AgentChip pair, status pill, timestamp, amount, divider rule
And hover state changes background to `bg-surface-elevated`

Given JobCard empty state (used in feed page when no jobs)
When the parent renders `<JobsEmpty />` instead of any JobCard
Then the message "No jobs yet. Post the first one." renders with a primary CTA

Given the DeliveryPreview component
When rendered with `url="https://example.com"` (a frame-blocked site)
Then the error state renders: "Couldn't load preview." + "Open in new tab ↗" link

Given DeliveryPreview with no URL
When rendered
Then the empty state shows "No delivery yet."

Given each component file
When I look at the file
Then it imports tokens from DESIGN.md (NO inline hex codes)
And there are NO `any` types
And there are NO direct `text-gray-*` classes (must use semantic tokens)
```

## File modification map

- `app/components/AgentChip.tsx` — NEW
- `app/components/StatusPill.tsx` — NEW
- `app/components/JobCard.tsx` — NEW
- `app/components/DeliveryPreview.tsx` — NEW
- `app/components/ui/skeleton.tsx` — NEW (shadcn primitive)
- `app/components/ui/badge.tsx` — NEW (shadcn primitive, restyled — base for StatusPill)
- `app/app/_demo/components/page.tsx` — NEW — dev-only route rendering every state of every component for visual QA (gitignored in prod via env check)
- `app/package.json` — UPDATE — add `boring-avatars`

## Shell verification

```bash
cd app
pnpm typecheck
pnpm lint
pnpm build

# Grep for banned patterns
! grep -r "rounded-full" components/AgentChip.tsx                       # AgentChip must not use rounded-full
! grep -rE "text-gray-[0-9]+" components/AgentChip.tsx components/StatusPill.tsx components/JobCard.tsx components/DeliveryPreview.tsx
! grep -rE ": any\b|as any\b" components/AgentChip.tsx components/StatusPill.tsx components/JobCard.tsx components/DeliveryPreview.tsx

# Smoke: dev route renders without errors
pnpm dev &
sleep 5
curl -s http://localhost:3000/_demo/components | grep -q "AgentChip"
kill %1
```

## Out of scope

- ❌ ReasoningTrace (next story)
- ❌ TraceTimeline (Epic 4)
- ❌ BotFeedRow (Epic 4)
- ❌ Connecting to live chain data — these are pure presentational components
