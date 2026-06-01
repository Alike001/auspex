import { formatEther } from "viem";
import type { Address, Hex, PublicClient } from "viem";
import type { Status } from "@/components/StatusPill";
import type { Step, StepTone } from "@/components/ReasoningTrace.types";
import { escrowAbi } from "@/lib/contracts";

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

/** Detect a wallet rejection across viem's wrapped error cause chain. */
export function isUserRejection(err: unknown): boolean {
  let e: unknown = err;
  for (let i = 0; i < 5 && e; i++) {
    const o = e as { name?: string; code?: number; message?: string; cause?: unknown };
    if (o.name === "UserRejectedRequestError" || o.code === 4001) return true;
    if (
      typeof o.message === "string" &&
      /user rejected|user denied|rejected the request/i.test(o.message)
    ) {
      return true;
    }
    e = o.cause;
  }
  return false;
}

/** Full on-chain snapshot of one escrow, read in a single Promise.all. */
export type EscrowSnapshot = {
  client: Address;
  deliverer: Address;
  briefHash: Hex;
  state: number;
  verdict: string;
  briefURI: string;
  deliveryUrl: string;
  reasoning: string;
};

/** Read every field the detail page needs from one escrow. Throws if the address
 *  isn't a live escrow (caller renders the "Job not found" state). */
export async function readEscrowState(
  client: PublicClient,
  address: Address,
): Promise<EscrowSnapshot> {
  const read = (
    functionName:
      | "client"
      | "deliverer"
      | "briefHash"
      | "state"
      | "verdict"
      | "briefURI"
      | "deliveryUrl"
      | "reasoning",
  ) => client.readContract({ address, abi: escrowAbi, functionName });

  const [clientAddr, deliverer, briefHash, state, verdict, briefURI, deliveryUrl, reasoning] =
    await Promise.all([
      read("client"),
      read("deliverer"),
      read("briefHash"),
      read("state"),
      read("verdict"),
      read("briefURI"),
      read("deliveryUrl"),
      read("reasoning"),
    ]);

  return {
    client: clientAddr as Address,
    deliverer: deliverer as Address,
    briefHash: briefHash as Hex,
    state: Number(state),
    verdict: verdict as string,
    briefURI: briefURI as string,
    deliveryUrl: deliveryUrl as string,
    reasoning: reasoning as string,
  };
}

/**
 * Map (state, verdict, reasoning) onto ReasoningTrace steps.
 *   Open      → no steps yet (awaiting delivery)
 *   Delivered → 3 pulsing placeholders (agents judging)
 *   Resolved/Claimed → the on-chain verdict + its bundled reasoning
 * The escrow stores one reasoning blob ("Verdict: … · Evidence: …"), not three
 * discrete steps — the per-step agent pipeline lives on the bot dashboard.
 */
export function buildReasoningSteps(state: number, verdict: string, reasoning: string): Step[] {
  if (state === EscrowState.Open) return [];
  if (state === EscrowState.Delivered) {
    return [
      { label: "Verifying URL", status: "inProgress" },
      { label: "Parsing content", status: "inProgress" },
      { label: "Judging against brief", status: "inProgress" },
    ];
  }
  const tone: StepTone = verdict === "released" ? "accent" : "danger";
  return [
    {
      label: `Verdict: ${verdict || "unknown"}`,
      status: "success",
      tone,
      detail: reasoning || undefined,
    },
  ];
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
