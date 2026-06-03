import type { Stats } from "./types";

/**
 * SummaryStrip — the bottom stats bar (ux-spec §7.1):
 *   "Last 60s: 12 jobs · 100% released · avg 1.3s settle"
 * Recomputed live as events flow.
 */
export function SummaryStrip({ stats }: { stats: Stats }) {
  const avg = stats.avgSettleMs > 0 ? `${(stats.avgSettleMs / 1000).toFixed(1)}s` : "—";
  return (
    <div className="rounded-lg border border-border bg-surface-hi px-4 py-3 text-sm text-text-secondary">
      <span className="text-text-muted">Last 60s: </span>
      <span className="font-mono tabular-nums text-text-primary">{stats.jobs}</span> jobs
      {" · "}
      <span className="font-mono tabular-nums text-text-primary">{stats.pctReleased}%</span> released
      {" · avg "}
      <span className="font-mono tabular-nums text-text-primary">{avg}</span> settle
    </div>
  );
}
