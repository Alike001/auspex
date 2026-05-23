# Story — trace-timeline-component

**Epic:** Epic 4 — Frontend #2 (Bot dashboard)
**Depends on:** `story-signature-components`
**Estimated:** 0.5 day
**Story slug:** `story-trace-timeline-component`

## Goal

Build `TraceTimeline` — the horizontal 3-node pipe per ux-spec §8.7. One node per agent step (json-api → parse-website → llm-judge). Used in Frontend #2's "Active pair" card.

## Acceptance criteria (BDD)

```
Given the TraceTimeline component
When rendered with steps = [{step:'json-api', status:'success'}, {step:'parse-website', status:'success'}, {step:'llm-judge', status:'inProgress'}]
Then 3 circular nodes render (24px), connected by lines
And node 1 (json-api) is filled with `bg-success`
And node 2 (parse-website) is filled with `bg-success`
And node 3 (llm-judge) is filled with `bg-info` and pulses (1.2s sine, 0.6 ↔ 1.0 opacity)
And labels below each node read "json-api" / "parse-website" / "llm-judge" in 11px text-text-muted uppercase

Given a step has status="success" and step="llm-judge"
When rendered
Then the node fills with `bg-accent` (NOT bg-success — accent reserved for final verdict success)

Given a step has status="error"
When rendered
Then the node fills with `bg-destructive` and the label text turns `text-destructive`

Given step.status = "pending"
When rendered
Then the node is an empty circle (border only) and label is muted

Given the component file
When I lint it
Then it uses `rounded-full` (allowed here because nodes represent PROCESS steps, not identities)
And has no `any` types
And references DESIGN.md tokens (no inline hex)
```

## File modification map

- `app/components/TraceTimeline.tsx` — NEW
- `app/components/TraceTimeline.types.ts` — NEW — Step shape (`json-api` | `parse-website` | `llm-judge`) × status (`pending` | `inProgress` | `success` | `error`)
- `app/app/_demo/components/page.tsx` — UPDATE — render all 4 status states of all 3 step types

## Shell verification

```bash
cd app
pnpm typecheck
pnpm lint
pnpm build

# DESIGN.md hex compliance
! grep -E "#[0-9A-Fa-f]{6}" components/TraceTimeline.tsx

# Allowed rounded-full because process nodes, not identities
grep "rounded-full" components/TraceTimeline.tsx   # at least 1 occurrence allowed here
```

## Out of scope

- ❌ Multi-step orchestration with > 3 nodes (v2 may add receipts)
- ❌ Click-to-expand step details (v2)
- ❌ Animated step transitions beyond the pulse
