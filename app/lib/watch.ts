import type { AuspexEvent } from "@/lib/event-types";

/**
 * Live event source — wraps Somnia's somnia_watch / @somnia-chain/reactivity to
 * stream real on-chain AuspexEvents as they happen.
 *
 * STUB for now: the real subscription wiring lands in story-somnia-watch-stream.
 * It emits nothing yet and returns a no-op unsubscribe, so useEventStream('live')
 * is already wired end-to-end and the dashboard renders an empty live feed
 * instead of crashing. Same signature as startPlayback, so the two are swappable.
 */
export function watchAuspexEvents(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEvent: (event: AuspexEvent) => void,
): () => void {
  return () => {};
}
