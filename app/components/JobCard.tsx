import Link from "next/link";
import { AgentChip } from "@/components/AgentChip";
import { StatusPill, type Status } from "@/components/StatusPill";

  type Party = { address: string; name?: string };

  type JobCardProps = {
    id: string;
    brief: string;
    status: Status;
    client: Party;
    freelancer: Party;
    amount: string;
    timestamp: string;
  };

  const DOT_COLOR: Record<Status, string> = {
    open: "bg-warning",
    judging: "bg-info",
    released: "bg-accent",
    refunded: "bg-danger",
    claimed: "bg-success",
  };

  export function JobCard({
    id,
    brief,
    status,
    client,
    freelancer,
    amount,
    timestamp,
  }: JobCardProps) {
    return (
      <Link
        href={`/jobs/${id}`}
        className="block border-b border-border px-5 py-4 transition hover:bg-surface-hi"
      >
        <div className="flex items-start gap-4">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-sm ${DOT_COLOR[status]}`} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-text-primary">{brief}</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-text-muted">
              <AgentChip address={client.address} name={client.name} />
              <span aria-hidden>→</span>
              <AgentChip address={freelancer.address} name={freelancer.name} />
              <StatusPill status={status} />
              <span className="text-xs">· {timestamp}</span>
            </div>
          </div>

          <span className="shrink-0 font-mono text-sm text-text-primary">
            {amount}
          </span>
        </div>
      </Link>
    );
  }

  export function JobsEmpty() {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
        <p className="text-sm text-text-secondary">No jobs yet. Post the first one.</p>
        <Link
          href="/jobs/new"
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-light"
        >
          Post a job
        </Link>
      </div>
    );
  }

