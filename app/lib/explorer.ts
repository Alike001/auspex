/**
 * Per-job metadata we can only get from the JobCreated event, not from a getter:
 *   - amount: the escrowed STT (no `amount` getter on Escrow; balance hits 0 after claim)
 *   - timestamp: block time of creation (no createdAt on-chain)
 *
 * Sourced from the factory's JobCreated logs via our own `/api/job-meta` route,
 * which proxies the Blockscout explorer server-side (the explorer omits CORS
 * headers on errors and can be slow, so a same-origin proxy keeps the browser
 * console clean). Best-effort: callers treat a thrown/empty result as "metadata
 * unavailable" and the feed/detail still render from RPC.
 */
export type JobMeta = { amount: bigint; timestamp: number };

export async function fetchJobMeta(): Promise<Map<string, JobMeta>> {
  const res = await fetch("/api/job-meta");
  if (!res.ok) throw new Error(`job-meta ${res.status}`);
  const json = (await res.json()) as {
    jobs: Record<string, { amount: string; timestamp: number }>;
  };

  const map = new Map<string, JobMeta>();
  for (const [escrow, meta] of Object.entries(json.jobs ?? {})) {
    map.set(escrow, { amount: BigInt(meta.amount), timestamp: meta.timestamp });
  }
  return map;
}
