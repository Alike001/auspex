import {
  createPublicClient,
  decodeEventLog,
  webSocket,
  type Abi,
  type Address,
  type Log,
} from "viem";
import { defineChain } from "viem";

export const somniaShannon = defineChain({
  id: 50312,
  name: "Somnia Shannon",
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://api.infra.testnet.somnia.network"],
      webSocket: ["wss://api.infra.testnet.somnia.network/ws"],
    },
  },
});

/// Subscribe to a specific event on an address via WebSocket. Resolves on the first
/// matching log within timeoutMs, rejects on timeout. Cleans up the subscription.
export async function awaitEvent<TAbi extends Abi>(opts: {
  wsUrl: string;
  address: Address;
  abi: TAbi;
  eventName: string;
  timeoutMs?: number;
}): Promise<{ args: Record<string, unknown>; log: Log }> {
  const { wsUrl, address, abi, eventName } = opts;
  const timeoutMs = opts.timeoutMs ?? 120_000;

  const client = createPublicClient({
    chain: { ...somniaShannon, rpcUrls: { default: { http: [], webSocket: [wsUrl] } } },
    transport: webSocket(wsUrl),
  });

  return new Promise((resolvePromise, rejectPromise) => {
    let unsubscribe: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsubscribe?.();
      rejectPromise(new Error(`awaitEvent timed out waiting for ${eventName} on ${address}`));
    }, timeoutMs);

    unsubscribe = client.watchContractEvent({
      address,
      abi,
      eventName: eventName as never,
      onLogs: (logs: Log[]) => {
        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi,
              data: log.data,
              topics: log.topics,
            }) as unknown as { eventName: string; args: Record<string, unknown> };
            if (decoded.eventName !== eventName) continue;
            clearTimeout(timer);
            unsubscribe?.();
            resolvePromise({ args: decoded.args, log });
            return;
          } catch {
            // Not the event we want — keep watching.
          }
        }
      },
      onError: (err: Error) => {
        clearTimeout(timer);
        unsubscribe?.();
        rejectPromise(err);
      },
    });
  });
}
