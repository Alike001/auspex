import type { Status } from "@/components/StatusPill";
import type { TraceStep, TraceStatus, TraceNode } from "@/components/TraceTimeline.types";
import type { AuspexEvent } from "@/lib/event-types";

/**
 * The dashboard consumes a flat AuspexEvent stream (playback or live) and folds it
 * into one JobModel per escrow. This file holds the pure fold + derived-stats logic
 * so BotsDashboard stays a thin wiring layer (and the logic is unit-testable).
 */

export type JobModel = {
  escrow: string;
  brief: string;
  amount: string;
  client?: string;
  deliverer: string;
  status: Status;
  trace: Record<TraceStep, TraceStatus>;
  verdict?: "released" | "refunded";
  reasoning?: string;
  txHash?: string;
  /** Monotonic insertion order — newest job has the highest seq. */
  seq: number;
  /** performance.now() when JobCreated was observed (arrival time). */
  createdMs: number;
  resolvedMs?: number;
};

/** The poster identity the canonical recording omits (data-fetcher bot). */
export const DATA_FETCHER = "0xAc3672B0f6134119d61b7222752B671CC392173F";

const AGENT_NAMES: Record<string, string> = {
  "0xac3672b0f6134119d61b7222752b671cc392173f": "data-fetcher",
  "0xde67a35b322e5a31e8215b5245ca4e48d7977f71": "scraper",
};

/** Friendly label for a known agent address, else undefined (chip shows the address). */
export function agentName(address?: string): string | undefined {
  return address ? AGENT_NAMES[address.toLowerCase()] : undefined;
}

const STEPS: TraceStep[] = ["json-api", "parse-website", "llm-judge"];

function emptyTrace(): Record<TraceStep, TraceStatus> {
  return { "json-api": "pending", "parse-website": "pending", "llm-judge": "pending" };
}

/** The three trace nodes for a job, in pipeline order, for <TraceTimeline>. */
export function traceNodes(job: JobModel): TraceNode[] {
  return STEPS.map((step) => ({ step, status: job.trace[step] }));
}

/** Settle time (ms) for a resolved job, else 0 (open/judging rows show 0.0s). */
export function settleMs(job: JobModel): number {
  return job.resolvedMs !== undefined ? job.resolvedMs - job.createdMs : 0;
}

/**
 * Apply one event to the job map in place. `t` is the arrival timestamp (shared
 * across a batch) and `nextSeq` supplies the insertion order for new jobs.
 */
export function applyEvent(
  jobs: Map<string, JobModel>,
  ev: AuspexEvent,
  t: number,
  nextSeq: () => number,
): void {
  switch (ev.type) {
    case "JobCreated": {
      jobs.set(ev.escrow, {
        escrow: ev.escrow,
        brief: ev.brief,
        amount: ev.amount,
        client: ev.client ?? DATA_FETCHER,
        deliverer: ev.deliverer,
        status: "open",
        trace: emptyTrace(),
        seq: nextSeq(),
        createdMs: t,
      });
      break;
    }
    case "AgentStep": {
      const job = jobs.get(ev.escrow);
      if (!job) break;
      job.trace = { ...job.trace, [ev.step]: ev.status };
      if (job.status === "open") job.status = "judging";
      break;
    }
    case "JobResolved": {
      const job = jobs.get(ev.escrow);
      if (!job) break;
      job.verdict = ev.verdict;
      job.reasoning = ev.reasoning;
      job.txHash = ev.txHash;
      job.status = ev.verdict;
      job.resolvedMs = t;
      // A resolution means the whole pipeline completed (live mode has no AgentSteps).
      job.trace = { "json-api": "success", "parse-website": "success", "llm-judge": "success" };
      break;
    }
    case "PayoutClaimed": {
      const job = jobs.get(ev.escrow);
      if (!job) break;
      job.status = "claimed";
      job.txHash = ev.txHash;
      break;
    }
    // BlockTick / ConnectionDegraded carry no job state — handled by the dashboard.
  }
}

export type Stats = { jobs: number; pctReleased: number; avgSettleMs: number };

/** "Last 60s" summary: job count, % released among resolved, average settle time. */
export function computeStats(jobs: JobModel[]): Stats {
  const resolved = jobs.filter((j) => j.verdict !== undefined);
  const released = resolved.filter((j) => j.verdict === "released").length;
  const settles = jobs.map(settleMs).filter((ms) => ms > 0);
  const avg = settles.length > 0 ? settles.reduce((a, b) => a + b, 0) / settles.length : 0;
  return {
    jobs: jobs.length,
    pctReleased: resolved.length > 0 ? Math.round((released / resolved.length) * 100) : 0,
    avgSettleMs: avg,
  };
}
