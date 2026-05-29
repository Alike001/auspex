  "use client";

  import { somniaShannon } from "@/lib/chain";
  import type { Step, StepTone } from "@/components/ReasoningTrace.types";

  const TONE_CLASS: Record<StepTone, string> = {
    success: "text-success",
    info: "text-info",
    accent: "text-accent",
    danger: "text-danger",
    muted: "text-text-muted",
  };

  function diamondClass(step: Step): string {
    switch (step.status) {
      case "pending":
        return "text-text-muted";
      case "inProgress":
        return "text-info animate-judging";
      case "error":
        return "text-danger";
      case "success":
        return TONE_CLASS[step.tone ?? "success"];
    }
  }

  const explorerBase = somniaShannon.blockExplorers.default.url;

  function shortHash(hash: string): string {
    return `0x…${hash.slice(-4)}`;
  }

  export function ReasoningTrace({
    steps,
    onRetry,
  }: {
    steps: Step[];
    onRetry?: () => void;
  }) {
    if (steps.length === 0) {
      return (
        <p className="text-sm text-text-muted">
          No reasoning yet — judging in progress…
        </p>
      );
    }

    return (
      <ol className="relative flex flex-col gap-5">
        {steps.map((step, i) => (
          <li
            key={i}
            className="animate-trace-in flex gap-3"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex flex-col items-center">
              <span className={`text-xs leading-5 ${diamondClass(step)}`}>◆</span>
              {i < steps.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-border" />
              )}
            </div>

            <div className="flex-1 pb-1">
              <p className="text-sm text-text-primary">{step.label}</p>

              {step.status !== "error" && step.detail && (
                <p className="mt-0.5 text-xs text-text-secondary">{step.detail}</p>
              )}

              {step.status === "success" && step.txHash && (
                <a
                  href={`${explorerBase}/tx/${step.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-mono text-xs text-accent-light hover:underline"
                >
                  Tx: {shortHash(step.txHash)} ↗
                </a>
              )}

              {step.status === "error" && (
                <>
                  <p className="mt-0.5 text-xs text-danger">{step.error}</p>
                  <button
                    type="button"
                    onClick={() => onRetry?.()}
                    className="mt-2 rounded-md border border-border-strong px-2.5 py-1 text-xs font-medium text-text-secondary transition hover:bg-surface"
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    );
  }
