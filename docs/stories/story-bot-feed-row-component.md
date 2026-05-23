# Story — bot-feed-row-component

**Epic:** Epic 4
**Depends on:** `story-signature-components`
**Estimated:** 0.25 day
**Story slug:** `story-bot-feed-row-component`

## Goal

`BotFeedRow` — denser JobCard variant per ux-spec §8.5. Slide-in animation when new rows arrive. Used in Frontend #2's "Recent transactions" list.

## Acceptance criteria (BDD)

```
Given the BotFeedRow component
When rendered with props (fromBot, toBot, briefExcerpt, status, durationMs, txHash, amount)
Then it renders a single row matching the layout in ux-spec §8.5
And height is ~52px (denser than JobCard)
And the status dot color matches the StatusPill color for that status

Given a new BotFeedRow added to the list
When the row mounts
Then it animates from translate-y(-8px) opacity(0) to translate-y(0) opacity(1) over 200ms ease-out

Given hover state
When mouse enters a BotFeedRow
Then bg becomes `bg-surface-elevated`

Given the txHash is provided
When the user clicks the explorer link
Then a new tab opens to `https://shannon-explorer.somnia.network/tx/<txHash>`
(URL pattern hardcoded; update if final explorer URL differs)
```

## File modification map

- `app/components/BotFeedRow.tsx` — NEW
- `app/components/BotFeedRow.types.ts` — NEW
- `app/app/_demo/components/page.tsx` — UPDATE — render a few rows with stagger so the slide-in is visible

## Shell verification

```bash
cd app
pnpm typecheck
pnpm lint
pnpm build
! grep -E "#[0-9A-Fa-f]{6}" components/BotFeedRow.tsx
```

## Out of scope

- ❌ Expansion / drill-down on click (v2)
- ❌ Bulk selection / actions
