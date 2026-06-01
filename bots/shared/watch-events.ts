/**
 * Shannon event subscriptions over WebSocket (the `somnia_watch` surface), via
 * viem's watchContractEvent. Two helpers:
 *   - watchJobCreated: long-lived subscription to the factory's JobCreated
 *   - awaitJobResolved: one-shot wait for a specific escrow's JobResolved
 */
import { createPublicClient, decodeEventLog, webSocket, type Address, type Hex } from "viem";
import { somniaShannon } from "./wallet.js";
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

/** Resolve on the first JobResolved for `escrow`, or reject after `timeoutMs`. */
export function awaitJobResolved(
  escrow: Address,
  timeoutMs = 180_000,
): Promise<{ verdict: string; reasoning: string }> {
  const client = createPublicClient({ chain: somniaShannon, transport: webSocket(WS_URL) });
  return new Promise((resolve, reject) => {
    let unwatch: (() => void) | undefined;
    const timer = setTimeout(() => {
      unwatch?.();
      reject(new Error(`timed out waiting for JobResolved on ${escrow}`));
    }, timeoutMs);

    unwatch = client.watchContractEvent({
      address: escrow,
      abi: escrowAbi,
      eventName: "JobResolved",
      onLogs: (logs) => {
        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi: escrowAbi,
              data: log.data,
              topics: log.topics,
            }) as unknown as { eventName: string; args: { verdict: string; reasoning: string } };
            if (decoded.eventName === "JobResolved") {
              clearTimeout(timer);
              unwatch?.();
              resolve({ verdict: decoded.args.verdict, reasoning: decoded.args.reasoning });
              return;
            }
          } catch {
            // unrelated log — ignore
          }
        }
      },
      onError: (err) => {
        clearTimeout(timer);
        unwatch?.();
        reject(err);
      },
    });
  });
}
