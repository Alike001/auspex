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
 *
 * Env (bots/.env): DATA_FETCHER_PRIVATE_KEY + SCRAPER_PRIVATE_KEY.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

import { log } from "./shared/log.js";
import { parseFlags, flag, numValue, strValue } from "./shared/cli-args.js";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

const HERE = dirname(fileURLToPath(import.meta.url));
const TSX = resolve(HERE, "node_modules/.bin/tsx");

/** Scraper events that mean "this job is done one way or another" — the cue to post the next. */
const TERMINAL = new Set(["PayoutClaimed", "Refunded", "ResolveTimeout", "UnknownBrief", "Error"]);

// Module-scoped so the SIGINT handler and crash detection can clean up.
let scraper: ChildProcess | undefined;
let dataFetcher: ChildProcess | undefined;
let logStream: WriteStream | undefined;
let shuttingDown = false;

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

    dataFetcher = spawn(TSX, [resolve(HERE, "data-fetcher.ts"), "--once"], {
      cwd: HERE,
      env: process.env,
    });
    pipeLines(dataFetcher, () => {});
    const dfCode = await onExit(dataFetcher);
    dataFetcher = undefined;
    if (shuttingDown) return; // we killed it during shutdown — not a crash
    if (dfCode !== 0) {
      log({ event: "ChildCrashed", process: "data-fetcher", code: dfCode });
      cleanupAndExit(3);
      return;
    }

    await completed; // scraper finished this job (claimed / refunded / failed)
    log({ event: "CycleComplete", cycle: i + 1, of: count });

    if (i < count - 1 && intervalMs > 0) await sleep(intervalMs);
  }

  shuttingDown = true;
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
