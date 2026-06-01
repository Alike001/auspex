/**
 * orchestrator — runs the autonomous bot demo end-to-end.
 *
 * Spawns the scraper as a long-lived child listener, then posts N jobs via the
 * data-fetcher, ONE AT A TIME: post → wait for the scraper to fully resolve+claim
 * that job → pause --interval → next. (The scraper handles one job at a time and
 * drops jobs while busy, so pacing to completion keeps every job in the loop and
 * gives the clean one-job-at-a-time rhythm the dashboard/recording want.)
 *
 *   pnpm bots:demo --count=3 --interval=4
 *   pnpm bots:demo --count=3 --log-file=runs/demo.jsonl
 *   pnpm bots:demo --count=2 --dry-run        # no chain: children run --dry-run
 *   pnpm bots:demo --count=12 --record=app/public/demo/canonical-60s.json  # capture playback asset
 *
 * Env (bots/.env): DATA_FETCHER_PRIVATE_KEY + SCRAPER_PRIVATE_KEY.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, mkdirSync, writeFileSync, type WriteStream } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

import { log } from "./shared/log.js";
import { parseFlags, flag, numValue, strValue } from "./shared/cli-args.js";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, ".."); // bots/ sits directly under the repo root
const TSX = resolve(HERE, "node_modules/.bin/tsx");

/** Scraper events that mean "this job is done one way or another" — the cue to post the next. */
const TERMINAL = new Set(["PayoutClaimed", "Refunded", "ResolveTimeout", "UnknownBrief", "Error"]);
/** Events worth capturing for the canonical playback recording. */
const RECORD_TYPES = new Set(["JobCreated", "ResolutionTriggered", "JobResolved", "PayoutClaimed", "Refunded"]);

// Module-scoped so the SIGINT handler and crash detection can clean up.
let scraper: ChildProcess | undefined;
let dataFetcher: ChildProcess | undefined;
let logStream: WriteStream | undefined;
let shuttingDown = false;

// --record: accumulate real events, then write a re-timed frame array at the end.
let recordPath: string | undefined;
const captured: Array<Record<string, unknown>> = [];
function capture(evt: Record<string, unknown>): void {
  if (recordPath && typeof evt.event === "string" && RECORD_TYPES.has(evt.event)) captured.push(evt);
}

function emit(line: string): void {
  process.stdout.write(line.endsWith("\n") ? line : line + "\n");
  logStream?.write(line.endsWith("\n") ? line : line + "\n");
}

/** Forward a child's stdout to ours + the log file, line by line, invoking onLine per JSON line. */
function pipeLines(child: ChildProcess, onLine: (evt: Record<string, unknown>) => void): void {
  let buf = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    buf += chunk.toString();
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (!line.trim()) continue;
      emit(line);
      try {
        onLine(JSON.parse(line));
      } catch {
        // non-JSON child output — already forwarded, nothing to dispatch
      }
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => process.stderr.write(chunk));
}

function onExit(child: ChildProcess): Promise<number> {
  return new Promise((res) => child.on("exit", (code) => res(code ?? 0)));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cleanupAndExit(code: number): void {
  shuttingDown = true;
  scraper?.kill("SIGTERM");
  dataFetcher?.kill("SIGTERM");
  setTimeout(() => {
    scraper?.kill("SIGKILL");
    logStream?.end();
    process.exit(code);
  }, 500);
}

function openLogFile(path: string): WriteStream {
  mkdirSync(dirname(resolve(HERE, path)), { recursive: true });
  return createWriteStream(resolve(HERE, path), { flags: "a" });
}

/**
 * Build the canonical playback recording from the captured events and write it to
 * `path` (resolved against the repo root, since it targets app/public/demo/...).
 *
 * The capture is real (real verdicts/reasonings/tx hashes) but the timeline is
 * SYNTHETIC: real resolutions take 30–120s each, so we lay the 12 jobs out evenly
 * across a ~58s playback window instead of using wall-clock offsets. Each job gets
 * its JobCreated, three injected AgentStep frames (the json-api → parse-website →
 * llm-judge pipeline the resolver runs), its JobResolved, and a PayoutClaimed if released.
 */
function buildAndWriteRecording(path: string): void {
  const TARGET_SPAN_MS = 58_000;
  const find = (escrow: unknown, event: string) =>
    captured.find((e) => e.event === event && e.escrow === escrow);

  const jobs = captured
    .filter((e) => e.event === "JobCreated")
    .map((c) => ({
      escrow: c.escrow,
      created: c,
      resolved: find(c.escrow, "JobResolved"),
      resolutionTx: find(c.escrow, "ResolutionTriggered")?.tx,
      claimTx: find(c.escrow, "PayoutClaimed")?.tx,
    }))
    .filter((j) => j.resolved); // only fully-resolved jobs make it into the recording

  const slot = TARGET_SPAN_MS / Math.max(jobs.length, 1);
  const frames: Array<{ atMs: number; type: string; payload: Record<string, unknown> }> = [];

  jobs.forEach((j, i) => {
    const base = Math.round(i * slot);
    frames.push({
      atMs: base,
      type: "JobCreated",
      payload: { escrow: j.escrow, brief: j.created.brief, amount: j.created.amount, deliverer: j.created.deliverer },
    });
    ["json-api", "parse-website", "llm-judge"].forEach((step, k) => {
      frames.push({ atMs: base + 600 * (k + 1), type: "AgentStep", payload: { escrow: j.escrow, step, status: "success" } });
    });
    const r = j.resolved as Record<string, unknown>;
    frames.push({
      atMs: base + 2600,
      type: "JobResolved",
      payload: { escrow: j.escrow, verdict: r.verdict, reasoning: r.reasoning, txHash: j.resolutionTx },
    });
    if (j.claimTx) {
      frames.push({ atMs: base + 3200, type: "PayoutClaimed", payload: { escrow: j.escrow, txHash: j.claimTx } });
    }
  });

  frames.sort((a, b) => a.atMs - b.atMs);
  const target = resolve(REPO_ROOT, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(frames, null, 2) + "\n");
  log({ event: "RecordingWritten", path, frames: frames.length, jobs: jobs.length, maxAtMs: frames.at(-1)?.atMs ?? 0 });
}

// ─────────── dry run: children run --dry-run, no chain ───────────

function runDryRun(count: number, intervalSec: number): void {
  const child = spawn(
    TSX,
    [resolve(HERE, "data-fetcher.ts"), "--dry-run", `--count=${count}`, `--interval=${intervalSec}`],
    { cwd: HERE, env: process.env, stdio: "inherit" },
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}

// ─────────── live: spawn scraper, post N jobs paced to completion ───────────

async function runLive(count: number, intervalMs: number): Promise<void> {
  if (!process.env.DATA_FETCHER_PRIVATE_KEY) {
    console.error("DATA_FETCHER_PRIVATE_KEY required");
    process.exit(1);
  }
  if (!process.env.SCRAPER_PRIVATE_KEY) {
    console.error("SCRAPER_PRIVATE_KEY required");
    process.exit(1);
  }

  let onlineResolve: () => void = () => {};
  const online = new Promise<void>((r) => (onlineResolve = r));
  let completionResolve: (() => void) | undefined;

  scraper = spawn(TSX, [resolve(HERE, "scraper.ts")], { cwd: HERE, env: process.env });
  pipeLines(scraper, (evt) => {
    capture(evt);
    if (evt.event === "ScraperOnline") onlineResolve();
    if (typeof evt.event === "string" && TERMINAL.has(evt.event)) {
      completionResolve?.();
      completionResolve = undefined;
    }
  });
  scraper.on("exit", (code) => {
    if (!shuttingDown) {
      log({ event: "ChildCrashed", process: "scraper", code: code ?? -1 });
      cleanupAndExit(3);
    }
  });

  // Wait for the scraper to come online (cap the wait so we don't hang forever).
  await Promise.race([online, sleep(20_000)]);

  for (let i = 0; i < count; i++) {
    const completed = new Promise<void>((r) => (completionResolve = r));

    // Retry a failed post (transient RPC timeouts shouldn't abort a long recording).
    let posted = false;
    for (let attempt = 1; attempt <= 3 && !posted; attempt++) {
      dataFetcher = spawn(TSX, [resolve(HERE, "data-fetcher.ts"), "--once"], { cwd: HERE, env: process.env });
      pipeLines(dataFetcher, capture);
      const dfCode = await onExit(dataFetcher);
      dataFetcher = undefined;
      if (shuttingDown) return; // we killed it during shutdown — not a crash
      if (dfCode === 0) posted = true;
      else {
        log({ event: "PostRetry", cycle: i + 1, attempt, code: dfCode });
        await sleep(2_000);
      }
    }
    if (!posted) {
      log({ event: "ChildCrashed", process: "data-fetcher", code: 1 });
      cleanupAndExit(3);
      return;
    }

    await completed; // scraper finished this job (claimed / refunded / failed)
    log({ event: "CycleComplete", cycle: i + 1, of: count });

    if (i < count - 1 && intervalMs > 0) await sleep(intervalMs);
  }

  shuttingDown = true;
  if (recordPath) buildAndWriteRecording(recordPath);
  log({ event: "OrchestratorDone", cycles: count });
  scraper.kill("SIGTERM");
  setTimeout(() => scraper?.kill("SIGKILL"), 3_000);
  await onExit(scraper).catch(() => {});
  logStream?.end();
  process.exit(0);
}

async function main(): Promise<void> {
  const f = parseFlags(process.argv.slice(2));
  const count = Math.max(1, numValue(f, "count", 1));
  const intervalSec = numValue(f, "interval", 0);
  const logFile = strValue(f, "log-file");
  if (logFile) logStream = openLogFile(logFile);
  recordPath = strValue(f, "record");

  process.on("SIGINT", () => {
    log({ event: "Interrupted" });
    cleanupAndExit(0);
  });

  if (flag(f, "dry-run")) {
    runDryRun(count, intervalSec);
  } else {
    await runLive(count, intervalSec * 1000);
  }
}

main().catch((err) => {
  log({ event: "Error", message: err instanceof Error ? err.message : String(err) });
  cleanupAndExit(1);
});
