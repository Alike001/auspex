# Story — reasoning-trace-component

**Epic:** Epic 2
**Depends on:** `story-signature-components`
**Estimated:** 0.5 day
**Story slug:** `story-reasoning-trace-component`

## Goal

Build `ReasoningTrace` — the signature component of Auspex. Vertical timeline of reasoning lines with stagger-fade-in animation. Each step has a coloured diamond marker. Renders every state from ux-spec §8.3.

## Acceptance criteria (BDD)

```
Given the ReasoningTrace component
When rendered with an array of 3 completed steps
Then each step has a `◆` diamond marker
And step 1 ("JSON API verified URL") shows in `text-success` colour for its diamond
And step 2 ("Parsed page content") shows in `text-info` colour for its diamond
And step 3 ("Verdict: released") shows in `text-accent` colour for its diamond
And the verdict step includes an explorer link "Tx: 0x…ff21 ↗"

Given ReasoningTrace with empty steps array
When rendered
Then the empty state shows "No reasoning yet — judging in progress…"

Given ReasoningTrace receiving streaming updates (one step at a time)
When a new step arrives
Then it fades in over 80ms via a staggered animation (Framer Motion or CSS keyframes)
And the diamond marker pulses while a step is `inProgress`

Given ReasoningTrace with an error step
When rendered
Then the error step's diamond is `text-destructive`
And a [Retry] button appears for the error step
And the body shows the error message

Given ReasoningTrace with verdict = "refunded"
When rendered
Then the verdict diamond is `text-destructive` (NOT `text-accent` — accent is reserved for "released")

Given the component file
When I read it
Then it accepts a typed `Step` array prop with discriminated union for status (`pending | inProgress | success | error`)
And it does not import any unrelated shadcn primitives
And it has zero `any` types
```

## File modification map

- `app/components/ReasoningTrace.tsx` — NEW
- `app/components/ReasoningTrace.types.ts` — NEW — `Step` discriminated union
- `app/app/_demo/components/page.tsx` — UPDATE — add ReasoningTrace state grid
- `app/package.json` — UPDATE — `framer-motion` (if needed for stagger; CSS-only acceptable)

## Shell verification

```bash
cd app
pnpm typecheck
pnpm lint
pnpm build

# Banned: no inline hex colors in the component
! grep -E "#[0-9A-Fa-f]{6}" components/ReasoningTrace.tsx

# Required: must reference accent token for "released" verdict only
grep "text-accent" components/ReasoningTrace.tsx
grep "text-destructive" components/ReasoningTrace.tsx

# Demo route renders all states
pnpm dev &
sleep 5
curl -s http://localhost:3000/_demo/components | grep -q "ReasoningTrace"
kill %1
```

## Out of scope

- ❌ Live-chain wiring (next stories pull data into this component)
- ❌ Receipt details modal (v2)
- ❌ Multi-step trace animations beyond stagger fade-in
