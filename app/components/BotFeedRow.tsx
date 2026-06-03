import { AgentChip } from "@/components/AgentChip";
import type { Status } from "@/components/StatusPill";
import type { BotFeedRowProps } from "@/components/BotFeedRow.types";

/**
 * BotFeedRow — a dense (~52px) single-row variant of JobCard (ux-spec §8.5) for
 * Frontend #2's "Recent transactions" list. Slides in (animate-feed-in: 200ms
 * ease-out, -8px → 0) when a new row mounts, so the live feed feels alive.
 *
 * The status dot reuses the StatusPill color for the same status, so the two
 * components stay visually in sync.
 */

const STATUS_DOT: Record<Status, string> = {
  open: "bg-warning",
  judging: "bg-info animate-judging",
  released: "bg-accent",
  refunded: "bg-danger",
  claimed: "bg-success",
};

const EXPLORER_TX = "https://shannon-explorer.somnia.network/tx/";

function durationLabel(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function BotFeedRow({
  fromBot,
  toBot,
  briefExcerpt,
  status,
  durationMs,
  txHash,
  amount,
}: BotFeedRowProps) {
  return (
    <div className="animate-feed-in flex min-h-[52px] items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-hi">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`}
        aria-label={status}
      />

      <div className="flex shrink-0 items-center gap-1.5">
        <AgentChip address={fromBot} />
        <span className="text-text-muted" aria-hidden="true">
          →
        </span>
        <AgentChip address={toBot} />
      </div>

      <p className="min-w-0 flex-1 truncate text-xs text-text-secondary">{briefExcerpt}</p>

      <span className="shrink-0 font-mono text-xs text-text-primary tabular-nums">{amount} STT</span>
      <span className="shrink-0 font-mono text-xs text-text-muted tabular-nums">
        {durationLabel(durationMs)}
      </span>

      {txHash && (
        <a
          href={`${EXPLORER_TX}${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 font-mono text-xs text-accent hover:text-accent-light"
          aria-label="View transaction on Shannon explorer"
        >
          tx ↗
        </a>
      )}
    </div>
  );
}
