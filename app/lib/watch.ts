import { createPublicClient, http, type Address } from "viem";
import { somniaShannon } from "@/lib/chain";
import { ESCROW_FACTORY_ADDRESS, escrowFactoryAbi, escrowAbi } from "@/lib/contracts";
import { decodeBrief, formatAmount } from "@/lib/auspex";
import type { AuspexEvent } from "@/lib/event-types";

/**
 * Live event source for the /bots dashboard's "live" mode.
 *
 * DESIGN NOTE — polls over HTTP, does NOT subscribe over WebSocket. The #22 story
 * specified a WebSocket-first design via @somnia-chain/reactivity with polling as a
 * fallback, but this build proved Shannon's WS event delivery silently drops events
 * without backfilling (it stalled the 12-job recording at job 11, and we converted
 * BOTH bot watchers to HTTP polling for the same reason). So polling is the PRIMARY
 * path here — the same getContractEvents-over-a-block-cursor pattern battle-tested in
 * bots/shared/watch-events.ts. Reliability beats matching the literal BDD.
 *
 * Forward-only (story out-of-scope: no historical replay): the cursor starts at the
 * current head, so only jobs posted from now on appear. Emits the SAME AuspexEvent
 * shape as the playback engine — the UI cannot tell live from replayed (see #21).
 * Note: AgentStep + PayoutClaimed are not on-chain events, so live mode shows the
 * on-chain milestones (JobCreated → JobResolved) plus BlockTick/ConnectionDegraded
 * status; the full agent pipeline animation is a playback-mode feature.
 */

const FACTORY = (process.env.NEXT_PUBLIC_ESCROW_FACTORY as Address | undefined) ?? ESCROW_FACTORY_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_SOMNIA_RPC; // optional override; else chain default

const POLL_MS = 2_000;

export function watchAuspexEvents(onEvent: (event: AuspexEvent) => void): () => void {
  const client = createPublicClient({ chain: somniaShannon, transport: http(RPC_URL) });

  let stopped = false;
  let fromBlock: bigint | undefined;
  const seen = new Set<Address>(); // escrows discovered via JobCreated (forward-only)
  const resolved = new Set<Address>(); // escrows whose JobResolved we've already emitted

  const emit = (event: AuspexEvent) => {
    if (!stopped) onEvent(event);
  };

  void (async () => {
    while (!stopped) {
      try {
        const latest = await client.getBlockNumber();
        if (fromBlock === undefined) fromBlock = latest; // first tick: start at head
        if (latest >= fromBlock) {
          // 1. New jobs from the factory.
          const created = await client.getContractEvents({
            address: FACTORY,
            abi: escrowFactoryAbi,
            eventName: "JobCreated",
            fromBlock,
            toBlock: latest,
          });
          for (const lg of created) {
            const a = lg.args as { escrow?: Address; client?: Address; deliverer?: Address; amount?: bigint };
            if (!a.escrow || !a.deliverer || a.amount === undefined) continue;
            seen.add(a.escrow);
            // Read + decode the brief so the live event matches the playback shape
            // (which carries decoded brief text, not the on-chain briefHash).
            let brief = "(brief unavailable)";
            try {
              const uri = (await client.readContract({
                address: a.escrow,
                abi: escrowAbi,
                functionName: "briefURI",
              })) as string;
              brief = decodeBrief(uri);
            } catch {
              /* keep placeholder — a missing brief shouldn't drop the event */
            }
            // formatAmount yields "2 STT"; the unified shape carries the bare number
            // ("2") and the UI appends the unit, so strip the suffix here.
            emit({
              type: "JobCreated",
              escrow: a.escrow,
              brief,
              amount: formatAmount(a.amount).replace(" STT", ""),
              deliverer: a.deliverer,
              client: a.client,
            });
          }

          // 2. Resolutions for jobs we've seen but not yet resolved.
          const pending = [...seen].filter((e) => !resolved.has(e));
          if (pending.length > 0) {
            const resolvedLogs = await client.getContractEvents({
              address: pending,
              abi: escrowAbi,
              eventName: "JobResolved",
              fromBlock,
              toBlock: latest,
            });
            for (const lg of resolvedLogs) {
              const a = lg.args as { verdict?: string; reasoning?: string };
              const escrow = lg.address as Address;
              if (a.verdict === undefined) continue;
              resolved.add(escrow);
              emit({
                type: "JobResolved",
                escrow,
                verdict: a.verdict === "released" ? "released" : "refunded",
                reasoning: a.reasoning ?? "",
                txHash: lg.transactionHash ?? "",
              });
            }
          }

          fromBlock = latest + BigInt(1);
          emit({ type: "BlockTick", blockNumber: Number(latest) });
        }
      } catch {
        // RPC hiccup — tell the UI it's degraded and keep retrying.
        emit({ type: "ConnectionDegraded" });
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  })();

  return () => {
    stopped = true;
  };
}
