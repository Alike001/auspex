import { somniaShannon } from "@/lib/chain";
import { ESCROW_FACTORY_ADDRESS } from "@/lib/contracts";

/**
 * Per-job metadata we can only get from the JobCreated event, not from a getter:
 *   - amount: the escrowed STT (no `amount` getter on Escrow; balance hits 0 after claim)
 *   - timestamp: block time of creation (no createdAt on-chain)
 *
 * The Somnia node caps eth_getLogs at a 1000-block range, so we read the logs from
 * the Blockscout explorer API instead (no range cap). Best-effort: callers treat a
 * thrown/empty result as "metadata unavailable" and the feed still renders from RPC.
 */
export type JobMeta = { amount: bigint; timestamp: number };

export async function fetchJobMeta(): Promise<Map<string, JobMeta>> {
  const base = somniaShannon.blockExplorers.default.url;
  const url =
    `${base}/api?module=logs&action=getLogs` +
    `&address=${ESCROW_FACTORY_ADDRESS}&fromBlock=0&toBlock=latest`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`explorer getLogs ${res.status}`);
  const json = await res.json();

  const map = new Map<string, JobMeta>();
  if (json.status !== "1" || !Array.isArray(json.result)) return map;

  for (const log of json.result) {
    // JobCreated(escrow indexed, client indexed, deliverer indexed, amount, briefHash)
    // topics[1] = escrow (indexed); data = amount(32 bytes) ++ briefHash(32 bytes)
    const escrow = `0x${log.topics[1].slice(26)}`.toLowerCase();
    const amount = BigInt(log.data.slice(0, 66)); // first 32-byte word
    const timestamp = parseInt(log.timeStamp, 16);
    map.set(escrow, { amount, timestamp });
  }
  return map;
}
