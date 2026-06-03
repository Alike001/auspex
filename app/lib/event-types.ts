import type { TraceStep, TraceStatus } from "@/components/TraceTimeline.types";

/**
 * AuspexEvent — the decoded form of a single on-chain happening, shared by BOTH
 * the playback engine (lib/playback.ts, replaying canonical-60s.json) and the
 * live somnia_watch wrapper (lib/watch.ts). The UI sink subscribes via
 * useEventStream(mode) and CANNOT tell the two sources apart — same shape,
 * different origin. This is the contract that makes "playback" and "live"
 * interchangeable.
 *
 * The shape mirrors canonical-60s.json's frame payloads exactly (a recording is
 * just a timestamped stream of these), so a frame decodes to an AuspexEvent with
 * `{ type, ...payload }`.
 */

/** A new job was posted: the client funded an escrow naming a deliverer + brief. */
export type JobCreatedEvent = {
  type: "JobCreated";
  /** Escrow contract address — the stable per-job identity used to group events. */
  escrow: string;
  /** Plain-text brief the deliverer must satisfy. */
  brief: string;
  /** Escrowed amount in STT, already formatted (e.g. "2"). */
  amount: string;
  /** Address that may deliver + claim. */
  deliverer: string;
};

/** The arbitration agent advanced one step of the resolution pipeline. */
export type AgentStepEvent = {
  type: "AgentStep";
  escrow: string;
  /** json-api → parse-website → llm-judge (see TraceTimeline). */
  step: TraceStep;
  status: TraceStatus;
};

/** The agent reached a verdict and the resolver wrote it on-chain. */
export type JobResolvedEvent = {
  type: "JobResolved";
  escrow: string;
  verdict: "released" | "refunded";
  /** Human-readable reasoning the agent recorded with the verdict. */
  reasoning: string;
  /** Resolution tx hash (0x…, 66 chars). */
  txHash: string;
};

/** Funds were paid out to the winning party. */
export type PayoutClaimedEvent = {
  type: "PayoutClaimed";
  escrow: string;
  txHash: string;
};

/**
 * System events — NOT on-chain happenings. Only the live watcher (lib/watch.ts)
 * emits these so the dashboard can show connection health; playback never does.
 * Consumers switch on `type` and ignore the ones they don't render.
 */

/** A poll/connection cycle failed — the UI can surface a "degraded" banner. */
export type ConnectionDegradedEvent = { type: "ConnectionDegraded" };

/** A successful poll observed a new chain head — a liveness heartbeat. */
export type BlockTickEvent = { type: "BlockTick"; blockNumber: number };

export type AuspexEvent =
  | JobCreatedEvent
  | AgentStepEvent
  | JobResolvedEvent
  | PayoutClaimedEvent
  | ConnectionDegradedEvent
  | BlockTickEvent;

/** A recorded frame: an AuspexEvent tagged with its playback offset (ms). */
export type RecordingFrame = {
  /** Offset from the start of the recording, in milliseconds. */
  atMs: number;
} & AuspexEvent;
