# Story — playback-engine

**Epic:** Epic 4
**Depends on:** `story-canonical-60s-recording`
**Estimated:** 0.5 day
**Story slug:** `story-playback-engine`

## Goal

`app/lib/playback.ts` — a frame-advancing engine that reads `canonical-60s.json` and emits frames to a UI sink against `performance.now()`. Loops at the end. The UI subscribes to a single `useEventStream(mode)` hook that returns either playback or live events.

## Acceptance criteria (BDD)

```
Given canonical-60s.json exists at `app/public/demo/canonical-60s.json`
When I import `startPlayback(callback)` from `app/lib/playback.ts` and call it
Then frames are emitted in order via the callback
And each frame fires within ±50ms of its `atMs` offset (anchored at performance.now() at startPlayback)

Given startPlayback returns a `stop()` function
When I call stop()
Then no further frames are emitted

Given the last frame in the file
When it fires
Then the engine loops back to frame 0 after a 1000ms gap
And the loop continues indefinitely until stop() is called

Given the hook `useEventStream(mode)`
When mode = 'playback'
Then it subscribes to startPlayback
When mode = 'live'
Then it subscribes to watchAuspexEvents from `app/lib/watch.ts`
And switching mode mid-flight cleanly unsubscribes the old source and subscribes the new

Given playback frames are emitted
When the UI receives them
Then they have the same shape as live events (decoded form)
And the UI sink cannot distinguish source except via mode flag
```

## File modification map

- `app/lib/playback.ts` — NEW — frame-advancing engine
- `app/lib/event-stream.ts` — NEW — `useEventStream(mode)` hook
- `app/lib/watch.ts` — NEW — somnia_watch wrapper (stub for now; live wiring in next story)
- `app/lib/event-types.ts` — NEW — shared `AuspexEvent` discriminated union

## Shell verification

```bash
cd app
pnpm typecheck
pnpm lint
pnpm build

# Unit-ish test: a node script imports playback and counts frames over 5s
pnpm tsx -e "
import { startPlayback } from './lib/playback.ts';
let count = 0;
const stop = startPlayback(() => count++);
setTimeout(() => { stop(); console.log('frames:', count); process.exit(count > 0 ? 0 : 1); }, 5000);
"
```

## Out of scope

- ❌ Scrubbing / seek (v2)
- ❌ Variable playback speed (v2)
- ❌ Persisting playback position across reloads
