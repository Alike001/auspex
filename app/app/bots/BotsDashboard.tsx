"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEventStream, type StreamMode } from "@/lib/event-stream";
import { ActivePairCard } from "./ActivePairCard";
import { RecentTransactionsList } from "./RecentTransactionsList";
import { SummaryStrip } from "./SummaryStrip";
import { applyEvent, computeStats, type JobModel } from "./types";

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

type LiveState = "idle" | "starting" | "live";

export function BotsDashboard() {
  const [mode, setMode] = useState<StreamMode>("playback");
  const [liveState, setLiveState] = useState<LiveState>("idle");
  const [toast, setToast] = useState<string | null>(null);

  const events = useEventStream(mode);

  // Fold the flat event stream into one JobModel per escrow. We process only the
  // events appended since the last run (processedRef), stamping arrival time so
  // settle durations reflect the real playback/live cadence.
  const [jobs, setJobs] = useState<Map<string, JobModel>>(new Map());
  const processedRef = useRef(0);
  const seqRef = useRef(0);

  useEffect(() => {
    // Mode switch resets the stream to [] — clear derived state and re-process.
    if (events.length < processedRef.current) {
      processedRef.current = 0;
      seqRef.current = 0;
      setJobs(new Map());
      return;
    }
    if (events.length === processedRef.current) return;
    const fresh = events.slice(processedRef.current);
    processedRef.current = events.length;
    const t = now();
    setJobs((prev) => {
      const next = new Map(prev);
      for (const ev of fresh) applyEvent(next, ev, t, () => seqRef.current++);
      return next;
    });
  }, [events]);

  const jobList = useMemo(() => [...jobs.values()], [jobs]);
  const activeJob = useMemo(
    () => (jobList.length ? jobList.reduce((a, b) => (b.seq > a.seq ? b : a)) : null),
    [jobList],
  );
  const stats = useMemo(() => computeStats(jobList), [jobList]);

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4_000);
    return () => clearTimeout(id);
  }, [toast]);

  async function startLive() {
    setLiveState("starting");
    try {
      const res = await fetch("/api/bot-trigger", { method: "POST" });
      if (!res.ok) throw new Error("trigger failed");
      setMode("live");
      setLiveState("live");
    } catch {
      setLiveState("idle");
      setToast("Couldn't start the live demo. Staying in playback.");
    }
  }

  async function stopLive() {
    try {
      await fetch("/api/bot-trigger", { method: "DELETE" });
    } catch {
      /* best-effort stop; fall back to playback regardless */
    }
    setMode("playback");
    setLiveState("idle");
  }

  const isLive = mode === "live";
  const buttonLabel =
    liveState === "starting" ? "Starting bots…" : isLive ? "Stop live demo" : "Run live demo";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent commerce</h1>
          <p className="mt-1 text-sm text-text-secondary">Two agents transacting via Auspex.</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${
              isLive ? "bg-warning/15 text-warning" : "bg-surface-hi text-text-muted"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-warning animate-judging" : "bg-text-muted"}`}
            />
            {isLive ? "Live" : "Playback"}
          </span>

          <button
            type="button"
            onClick={isLive ? stopLive : startLive}
            disabled={liveState === "starting"}
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface-hi px-3 py-1.5 text-sm font-medium text-text-primary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {liveState === "starting" && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
            )}
            {buttonLabel}
          </button>
        </div>
      </div>

      {/* crossfade on mode switch (≤200ms) */}
      <div key={mode} className="mt-8 animate-feed-in space-y-8">
        <ActivePairCard job={activeJob} />
        <RecentTransactionsList jobs={jobList} />
        <SummaryStrip stats={stats} />
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg border border-danger/40 bg-surface px-4 py-2 text-sm text-danger shadow-lg"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
