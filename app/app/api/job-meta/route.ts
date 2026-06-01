import { ESCROW_FACTORY_ADDRESS } from "@/lib/contracts";
import { somniaShannon } from "@/lib/chain";

/**
 * GET /api/job-meta
 *
 * Server-side proxy for the per-job amount + creation time, read from the
 * factory's JobCreated logs via the Blockscout explorer. We proxy rather than
 * fetch from the browser because:
 *   - the explorer doesn't send CORS headers on error responses (a 504 from it
 *     would otherwise spam the browser console), and
 *   - server-side we can bound the call with a timeout.
 * Always resolves to `{ jobs }` (empty when the explorer is unreachable) so the
 * feed/detail pages degrade to amount "—" instead of failing.
 */
type MetaEntry = { amount: string; timestamp: number };

export async function GET() {
  const base = somniaShannon.blockExplorers.default.url;
  const url =
    `${base}/api?module=logs&action=getLogs` +
    `&address=${ESCROW_FACTORY_ADDRESS}&fromBlock=0&toBlock=latest`;

  const jobs: Record<string, MetaEntry> = {};

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return Response.json({ jobs });
    const json = await res.json();
    if (json.status !== "1" || !Array.isArray(json.result)) return Response.json({ jobs });

    for (const log of json.result) {
      // JobCreated(escrow indexed, client indexed, deliverer indexed, amount, briefHash)
      const escrow = `0x${log.topics[1].slice(26)}`.toLowerCase();
      jobs[escrow] = {
        amount: BigInt(log.data.slice(0, 66)).toString(), // JSON can't carry bigint
        timestamp: parseInt(log.timeStamp, 16),
      };
    }
  } catch {
    // explorer down / timed out — return what we have (possibly empty)
  }

  return Response.json({ jobs });
}
