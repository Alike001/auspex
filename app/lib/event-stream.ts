"use client";

import { useEffect, useState } from "react";
import type { AuspexEvent } from "@/lib/event-types";
import { startPlayback } from "@/lib/playback";
import { watchAuspexEvents } from "@/lib/watch";

export type StreamMode = "playback" | "live";

/**
 * useEventStream — the single subscription point for the /bots dashboard. It hides
 * WHERE events come from: in 'playback' mode it drives off the canonical recording,
 * in 'live' mode off somnia_watch. The accumulated event list has identical shape
 * either way (AuspexEvent), so the UI is source-agnostic.
 *
 * Switching mode mid-flight tears down the old source (effect cleanup) and starts
 * the new one with a fresh, empty event list — no leaked timers or subscriptions.
 */
export function useEventStream(mode: StreamMode): AuspexEvent[] {
  const [events, setEvents] = useState<AuspexEvent[]>([]);
  const [activeMode, setActiveMode] = useState<StreamMode>(mode);

  // Reset the feed when the mode changes, during render — React's documented
  // "adjust state when a prop changes" pattern. Doing it here (not in the effect)
  // avoids the cascading re-render that a synchronous setState-in-effect causes.
  if (mode !== activeMode) {
    setActiveMode(mode);
    setEvents([]);
  }

  useEffect(() => {
    const onEvent = (event: AuspexEvent) => {
      setEvents((prev) => [...prev, event]);
    };
    const stop = mode === "playback" ? startPlayback(onEvent) : watchAuspexEvents(onEvent);
    return stop;
  }, [mode]);

  return events;
}
