import { formatEther } from "viem";
import type { Status } from "@/components/StatusPill";

/**
 * On-chain Escrow.State enum (see contracts/src/Escrow.sol):
 *   0 Open · 1 Delivered · 2 Resolved · 3 Claimed
 */
export const EscrowState = {
  Open: 0,
  Delivered: 1,
  Resolved: 2,
  Claimed: 3,
} as const;

/**
 * Collapse the raw (state, verdict) pair into the StatusPill status.
 * Resolved splits on the verdict string the resolver wrote ("released"/"refunded").
 */
export function toStatus(state: number, verdict: string): Status {
  switch (state) {
    case EscrowState.Open:
      return "open";
    case EscrowState.Delivered:
      return "judging";
    case EscrowState.Resolved:
      if (verdict === "released") return "released";
      if (verdict === "refunded") return "refunded";
      return "judging"; // resolved but verdict not yet legible — treat as in-flight
    case EscrowState.Claimed:
      return "claimed";
    default:
      return "open";
  }
}

/**
 * Recover the brief text from briefURI. The CLI demo writes it as
 *   data:text/plain;utf-8,<encodeURIComponent(text)>
 * so for data: URIs we decode in-place; anything else (ipfs/https) is returned raw.
 */
export function decodeBrief(briefURI: string): string {
  if (!briefURI) return "Untitled job";
  if (briefURI.startsWith("data:")) {
    const comma = briefURI.indexOf(",");
    if (comma === -1) return briefURI;
    try {
      return decodeURIComponent(briefURI.slice(comma + 1));
    } catch {
      return briefURI.slice(comma + 1);
    }
  }
  return briefURI;
}

/** Format a wei amount as a compact STT string, e.g. 500000000000000000n → "0.5 STT". */
export function formatAmount(wei: bigint): string {
  const full = formatEther(wei);
  // trim trailing zeros / dangling decimal point
  const trimmed = full.includes(".")
    ? full.replace(/\.?0+$/, "")
    : full;
  return `${trimmed} STT`;
}

/** "just now" / "3m ago" / "2h ago" / "4d ago" from a unix-seconds timestamp. */
export function formatRelativeTime(unixSeconds: number, nowSeconds: number): string {
  const diff = Math.max(0, nowSeconds - unixSeconds);
  if (diff < 60) return "just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
