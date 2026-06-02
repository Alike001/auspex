import { Fragment } from "react";
import type { TraceNode } from "./TraceTimeline.types";

/**
 * TraceTimeline — the horizontal 3-node pipe (ux-spec §8.7): one 24px node per
 * agent step (json-api → parse-website → llm-judge), connected by lines, with an
 * uppercase label below each. Used in Frontend #2's "Active pair" card.
 *
 * Fill rules:
 *   pending     → empty circle (border only), muted label
 *   inProgress  → bg-info + pulse (animate-judging: 1.2s, opacity 0.6 ↔ 1.0)
 *   success     → bg-success — EXCEPT the llm-judge node, which fills bg-accent
 *                 (accent is reserved for the final verdict, the moment of truth)
 *   error       → bg-danger + danger-colored label
 */

const LABEL_BASE = "text-[11px] uppercase tracking-[0.04em]";

function nodeFill(node: TraceNode): string {
  switch (node.status) {
    case "pending":
      return "border border-border-strong";
    case "inProgress":
      return "bg-info animate-judging";
    case "error":
      return "bg-danger";
    case "success":
      return node.step === "llm-judge" ? "bg-accent" : "bg-success";
  }
}

function labelClass(node: TraceNode): string {
  return node.status === "error" ? `${LABEL_BASE} text-danger` : `${LABEL_BASE} text-text-muted`;
}

export function TraceTimeline({ steps, className = "" }: { steps: TraceNode[]; className?: string }) {
  return (
    <div className={`flex items-start ${className}`} role="list" aria-label="Agent resolution pipeline">
      {steps.map((node, i) => (
        <Fragment key={node.step}>
          <div className="flex flex-col items-center gap-1.5" role="listitem">
            <span
              className={`h-6 w-6 shrink-0 rounded-full transition-colors ${nodeFill(node)}`}
              aria-label={`${node.step}: ${node.status}`}
            />
            <span className={labelClass(node)}>{node.step}</span>
          </div>
          {i < steps.length - 1 && (
            <span className="mt-3 h-px flex-1 bg-border" aria-hidden="true" />
          )}
        </Fragment>
      ))}
    </div>
  );
}
