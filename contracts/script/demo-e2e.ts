/**
 * Auspex live-testnet demo.
 *
 *   pnpm run demo:e2e              # happy path (released)
 *   pnpm run demo:e2e -- --negative # negative path (refunded)
 *
 * Prerequisites in `contracts/.env.local`:
 *   PRIVATE_KEY           — deployer + client wallet (needs ~3 STT on Shannon)
 *   SCRAPER_PRIVATE_KEY   — deliverer wallet (can be same key for hackathon demo)
 *   DEMO_HAPPY_URL        — public URL whose page contains <h1>Hello Auspex</h1>
 *   DEMO_NEGATIVE_URL     — public URL whose page does NOT contain that H1
 *   SHANNON_RPC_URL       — optional override (default Shannon public RPC)
 *   SHANNON_WS_URL        — optional override (default Shannon public WSS)
 */
import hre from "hardhat";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEther,
  toBytes,
  decodeEventLog,
  type Abi,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

import { somniaShannon, awaitEvent } from "./lib/await-event";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const factoryAbi = (require("../artifacts/src/EscrowFactory.sol/EscrowFactory.json") as { abi: Abi }).abi;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const escrowAbi = (require("../artifacts/src/Escrow.sol/Escrow.json") as { abi: Abi }).abi;

dotenv.config({ path: ".env.local" });

const NEGATIVE = process.argv.includes("--negative");

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const PK = need("PRIVATE_KEY") as `0x${string}`;
  const SCRAPER_PK = (process.env.SCRAPER_PRIVATE_KEY ?? PK) as `0x${string}`;
  const HAPPY_URL = need("DEMO_HAPPY_URL");
  const NEGATIVE_URL = need("DEMO_NEGATIVE_URL");
  const RPC = process.env.SHANNON_RPC_URL ?? "https://api.infra.testnet.somnia.network";
  const WS = process.env.SHANNON_WS_URL ?? "wss://api.infra.testnet.somnia.network/ws";

  const deliveryUrl = NEGATIVE ? NEGATIVE_URL : HAPPY_URL;
  console.log(`▶ Mode: ${NEGATIVE ? "NEGATIVE (expect refunded)" : "HAPPY (expect released)"}`);
  console.log(`▶ Delivery URL: ${deliveryUrl}`);

  // viem clients
  const deployerAccount = privateKeyToAccount(PK);
  const delivererAccount = privateKeyToAccount(SCRAPER_PK);
  const publicClient = createPublicClient({ chain: somniaShannon, transport: http(RPC) });
  const deployerClient = createWalletClient({
    account: deployerAccount,
    chain: somniaShannon,
    transport: http(RPC),
  });
  const delivererClient = createWalletClient({
    account: delivererAccount,
    chain: somniaShannon,
    transport: http(RPC),
  });

  console.log(`▶ Deployer/client: ${deployerAccount.address}`);
  console.log(`▶ Deliverer:       ${delivererAccount.address}`);

  const t0 = Date.now();

  // ─── Deploy AuspexResolver ───
  const PLATFORM = "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";
  const Resolver = await hre.ethers.getContractFactory("AuspexResolver");
  console.log("⏳ Deploying AuspexResolver...");
  const resolverContract = await Resolver.deploy(PLATFORM);
  await resolverContract.waitForDeployment();
  const resolverAddr = (await resolverContract.getAddress()) as Address;
  console.log(`✓ AuspexResolver at ${resolverAddr}`);

  // ─── Deploy EscrowFactory ───
  const Factory = await hre.ethers.getContractFactory("EscrowFactory");
  console.log("⏳ Deploying EscrowFactory...");
  const factoryContract = await Factory.deploy(resolverAddr);
  await factoryContract.waitForDeployment();
  const factoryAddr = (await factoryContract.getAddress()) as Address;
  console.log(`✓ EscrowFactory at ${factoryAddr}`);

  // Persist deployment addresses
  writeFileSync(
    resolvePath("deployments/shannon.json"),
    JSON.stringify({ EscrowFactory: factoryAddr, AuspexResolver: resolverAddr }, null, 2) + "\n"
  );
  console.log("✓ Wrote deployments/shannon.json");

  // ─── Create job ───
  const briefText = "The page at the delivered URL must have an H1 reading 'Hello Auspex'";
  const briefHash = keccak256(toBytes(briefText));
  const briefURI = `data:text/plain;utf-8,${encodeURIComponent(briefText)}`;
  const lockedAmount = parseEther("0.5");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

  console.log(`⏳ Creating job (locking ${lockedAmount} wei)...`);
  const createTxHash = await deployerClient.writeContract({
    address: factoryAddr,
    abi: factoryAbi,
    functionName: "createJob",
    args: [briefHash, briefURI, delivererAccount.address, deadline],
    value: lockedAmount,
  });
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createTxHash });

  let escrowAddr: Address | undefined;
  for (const log of createReceipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: factoryAbi,
        data: log.data,
        topics: log.topics,
      }) as unknown as { eventName: string; args: Record<string, unknown> };
      if (decoded.eventName === "JobCreated") {
        escrowAddr = decoded.args.escrow as Address;
        break;
      }
    } catch {
      // ignore unrelated logs
    }
  }
  if (!escrowAddr) throw new Error("JobCreated event not found in receipt");
  console.log(`✓ Escrow at ${escrowAddr}`);

  // ─── Subscribe to JobResolved BEFORE we trigger resolve ───
  console.log("⏳ Subscribing to JobResolved via WebSocket...");
  const jobResolvedPromise = awaitEvent({
    wsUrl: WS,
    address: escrowAddr,
    abi: escrowAbi,
    eventName: "JobResolved",
    timeoutMs: 180_000,
  });

  // ─── Deliverer submits delivery ───
  console.log(`⏳ Submitting delivery: ${deliveryUrl}`);
  const submitTxHash = await delivererClient.writeContract({
    address: escrowAddr,
    abi: escrowAbi,
    functionName: "submitDelivery",
    args: [deliveryUrl],
  });
  await publicClient.waitForTransactionReceipt({ hash: submitTxHash });
  console.log("✓ Delivery submitted");

  // ─── Trigger resolution (forwards 0.36 STT) ───
  console.log("⏳ Triggering resolve()...");
  const resolveTxHash = await deployerClient.writeContract({
    address: escrowAddr,
    abi: escrowAbi,
    functionName: "resolve",
  });
  const resolveReceipt = await publicClient.waitForTransactionReceipt({ hash: resolveTxHash });

  for (const log of resolveReceipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: escrowAbi,
        data: log.data,
        topics: log.topics,
      }) as unknown as { eventName: string; args: Record<string, unknown> };
      if (decoded.eventName === "JobResolutionTriggered") {
        const requestId = decoded.args.requestId as bigint;
        console.log(`✓ JSON API request id: ${requestId}`);
      }
    } catch {
      // ignore
    }
  }

  // ─── Wait for verdict ───
  console.log("⏳ Awaiting JobResolved (agent composition can take 30–120s)...");
  const { args: jobResolvedArgs } = await jobResolvedPromise;
  const verdict = (jobResolvedArgs as { verdict: string }).verdict;
  const reasoning = (jobResolvedArgs as { reasoning: string }).reasoning;
  console.log(`✓ Verdict: ${verdict}`);
  console.log(`✓ Reasoning: ${reasoning}`);

  // ─── Claim ───
  const claimer = verdict === "released" ? delivererClient : deployerClient;
  const claimerLabel = verdict === "released" ? "deliverer" : "client";
  console.log(`⏳ ${claimerLabel} claiming payout...`);
  const claimTxHash = await claimer.writeContract({
    address: escrowAddr,
    abi: escrowAbi,
    functionName: "claim",
  });
  await publicClient.waitForTransactionReceipt({ hash: claimTxHash });
  console.log(`✓ Claim tx: ${claimTxHash}`);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Total elapsed: ${elapsed}s`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✖ Demo failed:");
    console.error(err);
    process.exit(1);
  });
