/**
 * data-fetcher bot — an autonomous "client" that commissions scrape jobs via
 * Auspex with no human input. Picks a brief from the catalogue, posts a job to
 * the EscrowFactory naming the scraper bot as deliverer, and logs structured
 * JSON. Fire-and-forget: it does NOT wait for delivery (that's the scraper's job).
 *
 *   pnpm bots:data-fetcher --once
 *   pnpm bots:data-fetcher --count=3 --interval=2
 *   pnpm bots:data-fetcher --once --seed=42      # deterministic brief/amount
 *   pnpm bots:data-fetcher --dry-run --once      # validate wiring, send no tx
 *
 * Env (bots/.env, never committed):
 *   DATA_FETCHER_PRIVATE_KEY — funded Shannon wallet that posts + funds jobs
 *   SCRAPER_PRIVATE_KEY      — its address becomes the job's deliverer
 *   SHANNON_RPC_URL          — optional RPC override
 */
import * as dotenv from "dotenv";
import { keccak256, parseEther, formatEther, toBytes, parseEventLogs, type Address, type Hex } from "viem";

import { BRIEFS, type Brief } from "./shared/briefs.js";
import { log } from "./shared/log.js";
import { ESCROW_FACTORY_ADDRESS, escrowFactoryAbi } from "./shared/contracts.js";
import { makeAccount, makePublicClient, makeWalletClient } from "./shared/wallet.js";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

/** Locked amounts (STT) the bot rotates through. All exceed the resolution budget
 *  resolve() pulls from the escrow (3 × 0.5 = 1.5 STT) so resolve() never reverts
 *  InsufficientBalance, with the remainder as the deliverer's payout. */
const AMOUNTS_STT = ["1.8", "2.0", "2.2"] as const;
const MIN_BALANCE_WEI = parseEther("2.5");
/** A throwaway key used ONLY in --dry-run when real keys are absent, so wiring
 *  (address derivation, hashing, amount) can be checked with no secrets / no CI key. */
const DRY_RUN_DUMMY_KEY = `0x${"11".repeat(32)}` as Hex;

type Args = {
  dryRun: boolean;
  count: number;
  intervalMs: number;
  seed?: number;
};

function parseArgs(argv: string[]): Args {
  const has = (flag: string) => argv.includes(flag);
  const num = (name: string): number | undefined => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    if (!hit) return undefined;
    const v = Number(hit.split("=")[1]);
    return Number.isFinite(v) ? v : undefined;
  };
  return {
    dryRun: has("--dry-run"),
    count: has("--once") ? 1 : num("count") ?? 1,
    intervalMs: (num("interval") ?? 0) * 1000,
    seed: num("seed"),
  };
}

/** Pick a brief + amount. With a seed it's deterministic (same seed → same pick);
 *  without one it's random per call. */
function pick(seed: number | undefined, iteration: number): { brief: Brief; amountStt: string } {
  const base = seed === undefined ? Math.floor(Math.random() * 1e9) : seed + iteration;
  const brief = BRIEFS[base % BRIEFS.length];
  const amountStt = AMOUNTS_STT[base % AMOUNTS_STT.length];
  return { brief, amountStt };
}

function buildBriefURI(text: string): string {
  return `data:text/plain;utf-8,${encodeURIComponent(text)}`;
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const dataPk = process.env.DATA_FETCHER_PRIVATE_KEY;
  const scraperPk = process.env.SCRAPER_PRIVATE_KEY;

  // Real runs require both keys; dry runs fall back to a dummy key for wiring checks.
  if (!args.dryRun && !dataPk) {
    console.error("DATA_FETCHER_PRIVATE_KEY required");
    process.exit(1);
  }
  if (!args.dryRun && !scraperPk) {
    console.error("SCRAPER_PRIVATE_KEY required");
    process.exit(1);
  }

  const fetcherKey = (dataPk ?? DRY_RUN_DUMMY_KEY) as Hex;
  const delivererAddress = makeAccount((scraperPk ?? DRY_RUN_DUMMY_KEY) as Hex).address as Address;
  const fetcherAddress = makeAccount(fetcherKey).address as Address;

  const publicClient = makePublicClient();

  // Balance gate (real runs only — dry runs may use an unfunded dummy key).
  if (!args.dryRun) {
    const balance = await publicClient.getBalance({ address: fetcherAddress });
    if (balance < MIN_BALANCE_WEI) {
      console.error("Insufficient balance: need ≥ 2.5 STT");
      process.exit(2);
    }
  }

  const wallet = args.dryRun ? null : makeWalletClient(fetcherKey);

  for (let i = 0; i < args.count; i++) {
    const { brief, amountStt } = pick(args.seed, i);
    const value = parseEther(amountStt);
    const briefHash = keccak256(toBytes(brief.text));
    const briefURI = buildBriefURI(brief.text);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

    if (args.dryRun || !wallet) {
      log({
        event: "DryRun",
        briefId: brief.id,
        brief: brief.text,
        amount: amountStt,
        deliverer: delivererAddress,
        factory: ESCROW_FACTORY_ADDRESS,
        wouldLockWei: value.toString(),
      });
    } else {
      const txHash = await wallet.writeContract({
        address: ESCROW_FACTORY_ADDRESS,
        abi: escrowFactoryAbi,
        functionName: "createJob",
        args: [briefHash, briefURI, delivererAddress, deadline],
        value,
        chain: wallet.chain,
        account: wallet.account!,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const [created] = parseEventLogs({
        abi: escrowFactoryAbi,
        eventName: "JobCreated",
        logs: receipt.logs,
      });
      const escrow = created?.args?.escrow as Address | undefined;
      if (!escrow) {
        log({ event: "Error", message: "JobCreated not found in receipt", tx: txHash });
        process.exit(3);
      }
      log({
        event: "JobCreated",
        escrow,
        brief: brief.text,
        amount: formatEther(value),
        deliverer: delivererAddress,
        tx: txHash,
      });
    }

    if (i < args.count - 1) await sleep(args.intervalMs);
  }

  process.exit(0);
}

main().catch((err) => {
  log({ event: "Error", message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
