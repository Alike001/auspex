import { BotFeedRow } from "@/components/BotFeedRow";
import { type JobModel, settleMs, DATA_FETCHER } from "./types";

/**
 * RecentTransactionsList — the "Recent transactions" feed (ux-spec §7.1). Renders
 * the most recent jobs newest-first as dense BotFeedRows (each slides in on mount).
 * Capped at 20 visible rows — older jobs scroll off rather than growing unbounded.
 */

const MAX_ROWS = 20;

export function RecentTransactionsList({ jobs }: { jobs: JobModel[] }) {
  // jobs arrive oldest-first by seq; show newest first, capped.
  const rows = [...jobs].sort((a, b) => b.seq - a.seq).slice(0, MAX_ROWS);

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
        Recent transactions
      </h2>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-text-muted">
          No transactions yet.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-surface p-2">
          {rows.map((job) => (
            <BotFeedRow
              key={job.escrow}
              fromBot={job.client ?? DATA_FETCHER}
              toBot={job.deliverer}
              briefExcerpt={job.brief}
              status={job.status}
              durationMs={settleMs(job)}
              txHash={job.txHash}
              amount={job.amount}
            />
          ))}
        </div>
      )}
    </section>
  );
}
