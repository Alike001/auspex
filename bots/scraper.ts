/**
 * scraper bot — an autonomous "freelancer" that fulfils Auspex jobs end-to-end.
 *
 * Live loop (one job at a time): watch JobCreated → if it's the deliverer →
 * read the brief → scrape the brief's targetUrl → submitDelivery(public URL) →
 * resolve() (permissionless) → await JobResolved → claim() if released.
 *
 *   pnpm bots:scraper                       # listen forever
 *   pnpm bots:scraper --once                # process one job, then exit
 *   pnpm bots:scraper --demo-mode           # accept ALL jobs, not just ours
 *   pnpm bots:scraper --dry-run --synthesize-event 0xESCROW --target-url https://example.com
 *
 * Design notes (see contracts/src/AuspexResolver.sol):
 *   - The on-chain delivery URL is the PUBLIC targetUrl, not localhost — the
 *     Parse Website agent fetches it from the cloud and can't reach localhost.
 *   - On scrape failure we submit the unreachable /error sentinel so the job
 *     still resolves (to "refunded") instead of dangling in Delivered.
 *
 * Env (bots/.env): SCRAPER_PRIVATE_KEY — funded Shannon wallet (delivery + claim gas).
 */
import * as dotenv from "dotenv";
import { type Address } from "viem";

import { BRIEFS } from "./shared/briefs.js";
import { log } from "./shared/log.js";
import { escrowAbi, ESCROW_FACTORY_ADDRESS } from "./shared/contracts.js";
import { makeAccount, makePublicClient, makeWalletClient, somniaShannon } from "./shared/wallet.js";
import { scrapeUrl } from "./shared/scrape.js";
import { startDeliveryServer, type DeliveryServer } from "./shared/host-delivery.js";
import { watchJobCreated, awaitJobResolved, type JobCreatedEvent } from "./shared/watch-events.js";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const DELIVERY_PORT = 8788;

type Args = {
  dryRun: boolean;
  once: boolean;
  demoMode: boolean;
  synthesizeEscrow?: string;
  targetUrl?: string;
  resolveTimeoutMs: number;
};

function parseArgs(argv: string[]): Args {
  const has = (f: string) => argv.includes(f);
  const val = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
    const eq = argv.find((a) => a.startsWith(`--${name}=`));
    return eq ? eq.split("=").slice(1).join("=") : undefined;
  };
  const timeoutSec = Number(val("resolve-timeout"));
  return {
    dryRun: has("--dry-run"),
    once: has("--once"),
    demoMode: has("--demo-mode"),
    synthesizeEscrow: val("synthesize-event"),
    targetUrl: val("target-url"),
    resolveTimeoutMs: Number.isFinite(timeoutSec) && timeoutSec > 0 ? timeoutSec * 1000 : 180_000,
  };
}

function decodeBrief(uri: string): string {
  if (uri.startsWith("data:")) {
    const comma = uri.indexOf(",");
    if (comma === -1) return uri;
    try {
      return decodeURIComponent(uri.slice(comma + 1));
    } catch {
      return uri.slice(comma + 1);
    }
  }
  return uri;
}

/** Map an on-chain brief back to its catalogue target URL (only the text is on-chain). */
function targetForBrief(briefText: string, demoMode: boolean): string | null {
  const match = BRIEFS.find((b) => b.text === briefText);
  if (match) return match.targetUrl;
  return demoMode ? "https://example.com" : null;
}

// ─────────── dry run: synthesize a job, scrape, log DeliverySubmitted, exit ───────────

async function runDryRun(args: Args): Promise<void> {
  if (!args.targetUrl) {
    console.error("--dry-run requires --target-url");
    process.exit(1);
  }
  const escrow = (args.synthesizeEscrow ?? "0xDRYRUN") as string;
  const scrape = await scrapeUrl(args.targetUrl);
  if (!scrape.ok) {
    log({ event: "ScrapeFailed", escrow, target: args.targetUrl, reason: scrape.error ?? "unknown" });
  }
  // In a real run we'd submit the public targetUrl; on failure the /error sentinel.
  const deliveryUrl = scrape.ok ? args.targetUrl : `http://localhost:${DELIVERY_PORT}/error`;
  log({ event: "DeliverySubmitted", escrow, deliveryUrl, dryRun: true, heading: scrape.heading });
  process.exit(0);
}

// ─────────── live: one full job cycle ───────────

async function processJob(
  job: JobCreatedEvent,
  ctx: {
    scraperAddress: Address;
    server: DeliveryServer;
    resolveTimeoutMs: number;
    demoMode: boolean;
  },
): Promise<void> {
  const escrow = job.escrow;
  const publicClient = makePublicClient();
  const account = makeAccount(process.env.SCRAPER_PRIVATE_KEY as string);
  const wallet = makeWalletClient(process.env.SCRAPER_PRIVATE_KEY as string);

  // 1. Read + decode the brief, find its target.
  const briefURI = (await publicClient.readContract({
    address: escrow,
    abi: escrowAbi,
    functionName: "briefURI",
  })) as string;
  const briefText = decodeBrief(briefURI);
  const targetUrl = targetForBrief(briefText, ctx.demoMode);
  if (!targetUrl) {
    log({ event: "UnknownBrief", escrow, brief: briefText });
    return;
  }

  // 2. Scrape. On failure, submit the unreachable sentinel so the job still resolves.
  const scrape = await scrapeUrl(targetUrl);
  let deliveryUrl: string;
  if (scrape.ok) {
    ctx.server.record({
      jobId: escrow,
      targetUrl,
      heading: scrape.heading,
      content: scrape.content,
      scrapedAt: Date.now(),
    });
    deliveryUrl = targetUrl; // public URL the on-chain Parse Website agent can fetch
  } else {
    log({ event: "ScrapeFailed", escrow, target: targetUrl, reason: scrape.error ?? "unknown" });
    deliveryUrl = ctx.server.errorUrl;
  }

  // 3. submitDelivery
  const submitTx = await wallet.writeContract({
    address: escrow,
    abi: escrowAbi,
    functionName: "submitDelivery",
    args: [deliveryUrl],
    account,
    chain: somniaShannon,
  });
  await publicClient.waitForTransactionReceipt({ hash: submitTx });
  log({ event: "DeliverySubmitted", escrow, deliveryUrl, tx: submitTx });

  // 4. Trigger resolution (permissionless — pulls the 0.36 STT budget from escrow balance).
  const resolveTx = await wallet.writeContract({
    address: escrow,
    abi: escrowAbi,
    functionName: "resolve",
    account,
    chain: somniaShannon,
  });
  await publicClient.waitForTransactionReceipt({ hash: resolveTx });
  log({ event: "ResolutionTriggered", escrow, tx: resolveTx });

  // 5. Wait for the agent verdict.
  let verdict: string;
  try {
    const resolved = await awaitJobResolved(escrow, ctx.resolveTimeoutMs);
    verdict = resolved.verdict;
    log({ event: "JobResolved", escrow, verdict, reasoning: resolved.reasoning });
  } catch (err) {
    log({ event: "ResolveTimeout", escrow, reason: err instanceof Error ? err.message : String(err) });
    return;
  }

  // 6. Claim if we won (released → deliverer claims; refunded is the client's call).
  if (verdict === "released") {
    const claimTx = await wallet.writeContract({
      address: escrow,
      abi: escrowAbi,
      functionName: "claim",
      account,
      chain: somniaShannon,
    });
    await publicClient.waitForTransactionReceipt({ hash: claimTx });
    log({ event: "PayoutClaimed", escrow, tx: claimTx });
  } else {
    log({ event: "Refunded", escrow, note: "client claims refund; scraper takes no action" });
  }
}

async function runLive(args: Args): Promise<void> {
  const pk = process.env.SCRAPER_PRIVATE_KEY;
  if (!pk) {
    console.error("SCRAPER_PRIVATE_KEY required");
    process.exit(1);
  }
  const scraperAddress = makeAccount(pk).address as Address;
  const server = await startDeliveryServer(DELIVERY_PORT);
  log({ event: "ScraperOnline", address: scraperAddress, factory: ESCROW_FACTORY_ADDRESS, demoMode: args.demoMode });

  let busy = false;
  let handled = 0;

  const unwatch = watchJobCreated(
    (job) => {
      void (async () => {
        // Serial: v1 handles one job at a time (parallel is out of scope).
        if (busy) return;
        const mine = job.deliverer.toLowerCase() === scraperAddress.toLowerCase();
        if (!args.demoMode && !mine) return;

        busy = true;
        try {
          await processJob(job, {
            scraperAddress,
            server,
            resolveTimeoutMs: args.resolveTimeoutMs,
            demoMode: args.demoMode,
          });
          handled++;
        } catch (err) {
          log({ event: "Error", escrow: job.escrow, message: err instanceof Error ? err.message : String(err) });
        } finally {
          busy = false;
          if (args.once && handled >= 1) {
            unwatch();
            await server.close();
            process.exit(0);
          }
        }
      })();
    },
    (err) => log({ event: "WatchError", message: err.message }),
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.dryRun) {
    await runDryRun(args);
  } else {
    await runLive(args);
  }
}

main().catch((err) => {
  log({ event: "Error", message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
