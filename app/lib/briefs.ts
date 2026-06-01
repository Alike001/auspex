import { keccak256, toHex } from "viem";
import type { Hex } from "viem";
import { decodeBrief } from "@/lib/auspex";

/**
 * Brief commitment scheme (v1).
 *
 * The brief text lives ON-CHAIN inside the escrow's `briefURI`, encoded as a
 * `data:` URI. This makes briefs permanent and recoverable client-side with no
 * storage infra — the feed's `decodeBrief()` already reads this exact shape, and
 * the original CLI demo wrote jobs the same way. `briefHash` is a keccak256
 * commitment to the raw UTF-8 text (the contract stores hash + URI independently
 * and does not verify them against each other).
 */
export const BRIEF_MIN_CHARS = 20;
export const BRIEF_MAX_CHARS = 1000;

/** Encode the brief text as the `data:` URI stored on-chain in `briefURI`. */
export function buildBriefURI(text: string): string {
  return `data:text/plain;utf-8,${encodeURIComponent(text)}`;
}

/** keccak256 of the raw UTF-8 brief text — the on-chain `briefHash` commitment. */
export function hashBrief(text: string): Hex {
  return keccak256(toHex(text));
}

/**
 * Resolve a `briefURI` to the brief text. v1 jobs store the brief inline as a
 * `data:` URI (decoded synchronously); anything else (ipfs/https) is fetched.
 */
export async function fetchBriefByURI(briefURI: string): Promise<string> {
  if (!briefURI) return "Untitled job";
  if (briefURI.startsWith("data:")) return decodeBrief(briefURI);
  try {
    const res = await fetch(briefURI);
    if (!res.ok) throw new Error(`brief fetch ${res.status}`);
    return (await res.text()) || "Untitled job";
  } catch {
    return decodeBrief(briefURI);
  }
}

/** Validate brief length; returns an error message or null if acceptable. */
export function validateBrief(text: string): string | null {
  const len = text.trim().length;
  if (len < BRIEF_MIN_CHARS) return `Brief must be at least ${BRIEF_MIN_CHARS} characters`;
  if (text.length > BRIEF_MAX_CHARS) return `Brief must be at most ${BRIEF_MAX_CHARS} characters`;
  return null;
}
