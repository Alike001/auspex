export type Status = "open" | "judging" | "released" | "refunded" | "claimed";

  const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
    open: { label: "Awaiting delivery", className: "bg-warning/15 text-warning" },
    judging: { label: "Judging", className: "bg-info/15 text-info animate-judging" },
    released: { label: "Released", className: "bg-accent/15 text-accent" },
    refunded: { label: "Refunded", className: "bg-danger/15 text-danger" },
    claimed: { label: "Paid", className: "bg-success/15 text-success" },
  };

  export function StatusPill({ status }: { status: Status }) {
    const { label, className } = STATUS_CONFIG[status];
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em] ${className}`}
      >
        {label}
      </span>
    );
  }
