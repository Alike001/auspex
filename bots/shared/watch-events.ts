/**
 * Shannon event helpers. Both POLL over HTTP rather than subscribing over
 * WebSocket: Shannon's WS event delivery is flaky — a watchContractEvent
 * subscription silently dropped a real JobResolved during testing, and a real
 * JobCreated during a 12-job recording (the socket closed mid-run and the
 * subscription, unlike a getLogs poll, does NOT backfill events missed while
 * disconnected, so the scraper never saw that job and the run hung). Polling a
 * [fromBlock, latest] range is slower but catches every event.
 *   - watchJobCreated: long-lived poll of the factory's JobCreated
 *   - awaitJobResolved: one-shot wait for a specific escrow's JobResolved
 */
import { type Address, type Hex } from "viem";
import { makePublicClient } from "./wallet.js";
import { ESCROW_FACTORY_ADDRESS, escrowFactoryAbi, escrowAbi } from "./contracts.js";

export type JobCreatedEvent = {
  escrow: Address;
  client: Address;
  deliverer: Address;
  amount: bigint;
  briefHash: Hex;
};

/**
 * Poll the factory for JobCreated logs. Returns a stop function.
 *
 * We start the cursor at the current head (we only care about jobs posted from
 * now on) and advance it past every range we've scanned, so a job posted while
 * we're sleeping between polls is picked up on the next poll instead of lost.
 */
export function watchJobCreated(
  onJob: (job: JobCreatedEvent) => void,
  onError?: (err: Error) => void,
  pollMs = 3_000,
): () => void {
  const client = makePublicClient();
  let stopped = false;
  let fromBlock: bigint | undefined;

  void (async () => {
    while (!stopped) {
      try {
        const latest = await client.getBlockNumber();
        if (fromBlock === undefined) fromBlock = latest; // first tick: start at head
        if (latest >= fromBlock) {
          const logs = await client.getContractEvents({
            address: ESCROW_FACTORY_ADDRESS,
            abi: escrowFactoryAbi,
            eventName: "JobCreated",
            fromBlock,
            toBlock: latest,
          });
          for (const lg of logs) {
            const a = lg.args as Partial<JobCreatedEvent>;
            if (a.escrow && a.client && a.deliverer && a.amount !== undefined && a.briefHash) {
              onJob({ escrow: a.escrow, client: a.client, deliverer: a.deliverer, amount: a.amount, briefHash: a.briefHash });
            }
          }
          fromBlock = latest + 1n;
        }
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
  })();

  return () => {
    stopped = true;
  };
}

/**
 * Wait for an escrow to reach Resolved (or Claimed) by POLLING state over HTTP.
 * We poll rather than subscribe because Shannon's WS event delivery is flaky —
 * a watchContractEvent subscription silently missed a real JobResolved during
 * testing, causing a false timeout. Polling `state()` is slower but reliable.
 */
export async function awaitJobResolved(
  escrow: Address,
  timeoutMs = 180_000,
  pollMs = 4_000,
): Promise<{ verdict: string; reasoning: string }> {
  const client = makePublicClient();
  const read = (functionName: "state" | "verdict" | "reasoning") =>
    client.readContract({ address: escrow, abi: escrowAbi, functionName });

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = Number(await read("state"));
    if (state >= 2) {
      // Resolved(2) or Claimed(3) — the verdict + reasoning are now set.
      const [verdict, reasoning] = await Promise.all([read("verdict"), read("reasoning")]);
      return { verdict: verdict as string, reasoning: reasoning as string };
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(`timed out waiting for resolution on ${escrow}`);
}
