import type { AuspexEvent } from "@/lib/event-types";
// Runtime (value) import is RELATIVE on purpose: the story's Node smoke test runs
// this file through tsx, where the `@/` tsconfig alias is not resolved. Type-only
// imports above are erased by esbuild and never resolved, so they stay on `@/`.
import recording from "../public/demo/canonical-60s.json";

/**
 * Playback engine — replays the canonical 12-job demo recording as a live-looking
 * AuspexEvent stream, so the /bots dashboard always has something to show even
 * with no chain activity. Frames fire against performance.now() at their recorded
 * `atMs` offset, then the whole recording loops after a 1s gap, indefinitely.
 *
 * Pure timing logic — no React, no DOM. The UI subscribes via useEventStream and
 * cannot tell a replayed frame from a live one (see lib/event-types.ts).
 */

/** On-disk frame shape: an event tagged with its offset, payload kept nested. */
type RawFrame = {
  atMs: number;
  type: AuspexEvent["type"];
  payload: Record<string, unknown>;
};

const FRAMES = recording as RawFrame[];

/** Gap (ms) after the last frame before the recording loops back to frame 0. */
const LOOP_GAP_MS = 1_000;

const LAST_AT_MS = FRAMES.length > 0 ? FRAMES[FRAMES.length - 1].atMs : 0;

/** performance.now() where available (browser + Node ≥16), else Date.now(). */
function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Flatten a raw frame into its decoded AuspexEvent (`{ type, ...payload }`). */
function decode(frame: RawFrame): AuspexEvent {
  return { type: frame.type, ...frame.payload } as AuspexEvent;
}

/**
 * Begin replaying the recording. `callback` is invoked with each decoded event
 * in order, each within a few ms of its `atMs` offset (anchored at the moment
 * startPlayback runs). After the final frame the engine waits LOOP_GAP_MS and
 * replays from the top. Returns a `stop()` that cancels all pending timers and
 * guarantees no further callbacks fire.
 */
export function startPlayback(callback: (event: AuspexEvent) => void): () => void {
  let stopped = false;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const schedule = (delay: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!stopped) fn();
    }, Math.max(0, delay));
    timers.add(id);
  };

  const runCycle = () => {
    const anchor = now();
    for (const frame of FRAMES) {
      // Re-measure elapsed each schedule so a single slow frame can't drift the rest.
      schedule(frame.atMs - (now() - anchor), () => callback(decode(frame)));
    }
    // Loop: re-anchor a fresh cycle one LOOP_GAP_MS after the final frame.
    schedule(LAST_AT_MS + LOOP_GAP_MS - (now() - anchor), runCycle);
  };

  runCycle();

  return () => {
    stopped = true;
    for (const id of timers) clearTimeout(id);
    timers.clear();
  };
}
