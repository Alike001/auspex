/**
 * Shannon event subscriptions over WebSocket (the `somnia_watch` surface), via
 * viem's watchContractEvent. Two helpers:
 *   - watchJobCreated: long-lived subscription to the factory's JobCreated
 *   - awaitJobResolved: one-shot wait for a specific escrow's JobResolved
 */
import { createPublicClient, decodeEventLog, webSocket, type Address, type Hex } from "viem";
import { somniaShannon, makePublicClient } from "./wallet.js";
import { ESCROW_FACTORY_ADDRESS, escrowFactoryAbi, escrowAbi } from "./contracts.js";

const WS_URL = process.env.SHANNON_WS_URL ?? "wss://api.infra.testnet.somnia.network/ws";

export type JobCreatedEvent = {
  escrow: Address;
  client: Address;
  deliverer: Address;
  amount: bigint;
  briefHash: Hex;
};

/** Subscribe to JobCreated on the factory. Returns an unsubscribe function. */
export function watchJobCreated(
  onJob: (job: JobCreatedEvent) => void,
  onError?: (err: Error) => void,
): () => void {
  const client = createPublicClient({ chain: somniaShannon, transport: webSocket(WS_URL) });
  return client.watchContractEvent({
    address: ESCROW_FACTORY_ADDRESS,
    abi: escrowFactoryAbi,
    eventName: "JobCreated",
    onLogs: (logs) => {
      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: escrowFactoryAbi,
            data: log.data,
            topics: log.topics,
          }) as unknown as { eventName: string; args: JobCreatedEvent };
          if (decoded.eventName === "JobCreated") onJob(decoded.args);
        } catch {
          // unrelated log — ignore
        }
      }
    },
    onError: (err) => onError?.(err),
  });
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
