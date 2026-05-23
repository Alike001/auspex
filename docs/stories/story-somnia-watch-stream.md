# Story — somnia-watch-stream

**Epic:** Epic 4
**Depends on:** `story-playback-engine`
**Estimated:** 0.5 day
**Story slug:** `story-somnia-watch-stream`

## Goal

Wire `app/lib/watch.ts` to the live `somnia_watch` WebSocket via `@somnia-chain/reactivity` SDK. Decodes `JobCreated`, `JobDelivered`, `JobResolved` events into the shared `AuspexEvent` type. Provides a polling fallback for environments without WebSocket.

## Acceptance criteria (BDD)

```
Given NEXT_PUBLIC_SOMNIA_WS and NEXT_PUBLIC_ESCROW_FACTORY are set
When I import `watchAuspexEvents(callback)` and call it
Then a WebSocket connection is opened to NEXT_PUBLIC_SOMNIA_WS
And the subscription's eventContractSources includes EscrowFactory + AuspexResolver
And topicOverrides match the keccak256 of JobCreated, JobDelivered, JobResolved signatures

Given the WebSocket receives a JobCreated event
When the SDK invokes onData
Then the callback fires with a decoded AuspexEvent: { type: "JobCreated", payload: { escrow, client, deliverer, amount, briefHash } }

Given the WebSocket fails to connect or drops
When 5 seconds pass without a heartbeat
Then the engine falls back to polling `eth_getLogs` every 2 seconds
And emits a `{ type: "ConnectionDegraded" }` system event so the UI can show a banner

Given `unsubscribe()` is returned and called
When invoked
Then the WebSocket closes within 1 second
And no further callbacks fire
```

## File modification map

- `app/lib/watch.ts` — UPDATE — full implementation of watchAuspexEvents
- `app/lib/event-types.ts` — UPDATE — add `ConnectionDegraded` and `BlockTick` system events
- `app/package.json` — UPDATE — add `@somnia-chain/reactivity`
- `app/.env.example` — UPDATE — already has NEXT_PUBLIC_SOMNIA_WS

## Shell verification

```bash
cd app
pnpm typecheck
pnpm lint
pnpm build

# Smoke: connect for 3 seconds and count events
pnpm tsx -e "
import { watchAuspexEvents } from './lib/watch.ts';
let n = 0;
const stop = watchAuspexEvents((ev) => { n++; console.log('event', ev.type); });
setTimeout(() => { stop(); console.log('events:', n); process.exit(0); }, 3000);
"
```

## Out of scope

- ❌ Historical event replay on connect (only goes forward from now)
- ❌ Multi-chain support
- ❌ Persistent storage of event history
