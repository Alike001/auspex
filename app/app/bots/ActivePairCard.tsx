import { AgentChip } from "@/components/AgentChip";
import { StatusPill } from "@/components/StatusPill";
import { TraceTimeline } from "@/components/TraceTimeline";
import { type JobModel, agentName, traceNodes, settleMs, DATA_FETCHER } from "./types";

/**
 * ActivePairCard — the highlight card (ux-spec §7.1): the two transacting agents,
 * the brief, and the horizontal TraceTimeline for the job currently in flight.
 * Falls back to a warming-up message when no job has arrived yet.
 */

function durationLabel(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ActivePairCard({ job }: { job: JobModel | null }) {
  if (!job) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="h-2 w-2 animate-judging rounded-full bg-info" />
          Bots warming up… expect the first transaction within 5 seconds.
        </div>
      </div>
    );
  }

  const client = job.client ?? DATA_FETCHER;
  const resolved = job.verdict !== undefined;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <AgentChip address={client} name={agentName(client)} />
        <span className="text-text-muted" aria-hidden="true">
          →
        </span>
        <AgentChip address={job.deliverer} name={agentName(job.deliverer)} />
      </div>

      <p className="mt-3 text-sm text-text-secondary">
        <span className="text-text-muted">Brief: </span>
        {job.brief}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <TraceTimeline steps={traceNodes(job)} />
        <div className="flex items-center gap-2">
          <StatusPill status={job.status} />
          {resolved && (
            <span className="font-mono text-xs text-text-muted tabular-nums">
              {durationLabel(settleMs(job))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
