/** A single agent step in the resolution pipeline (json-api → parse-website → llm-judge). */
export type TraceStep = "json-api" | "parse-website" | "llm-judge";

/** Lifecycle of one step within a live (or replayed) resolution. */
export type TraceStatus = "pending" | "inProgress" | "success" | "error";

export type TraceNode = {
  step: TraceStep;
  status: TraceStatus;
};
