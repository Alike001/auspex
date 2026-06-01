/**
 * viem wallet + client factory for the Auspex bots, pinned to Somnia Shannon.
 * Mirrors the chain config the CLI demo (contracts/script/demo-e2e.ts) and the
 * app (app/lib/chain.ts) use, so all three talk to the same testnet.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Chain,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const RPC_URL =
  process.env.SHANNON_RPC_URL ?? "https://api.infra.testnet.somnia.network";

export const somniaShannon = {
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: { name: "Shannon Explorer", url: "https://shannon-explorer.somnia.network" },
  },
  testnet: true,
} as const satisfies Chain;

/** Derive an account from a 0x-prefixed private key. */
export function makeAccount(privateKey: string): Account {
  return privateKeyToAccount(privateKey as `0x${string}`);
}

/** Read-only client for balances, receipts, and log queries. */
export function makePublicClient(): PublicClient {
  return createPublicClient({ chain: somniaShannon, transport: http(RPC_URL) });
}

/** Signing client bound to the given private key. */
export function makeWalletClient(privateKey: string): WalletClient {
  return createWalletClient({
    account: makeAccount(privateKey),
    chain: somniaShannon,
    transport: http(RPC_URL),
  });
}
