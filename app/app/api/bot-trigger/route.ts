import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * POST /api/bot-trigger — start the bot orchestrator (data-fetcher posts jobs, the
 * scraper resolves them) so the dashboard's "live" mode has real on-chain activity.
 * DELETE — signal it to stop.
 *
 * LOCAL-ONLY by nature: it spawns a long-lived tsx child process against the bots
 * workspace + bots/.env (private keys + STT). On Vercel there is no bots workspace
 * and no persistent process, so we detect the missing tsx binary and return 503 —
 * the dashboard catches that and stays in playback with a toast (per the spec).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Module-scoped handle. Persists only within a single dev server process; on
// serverless each invocation is cold, which is fine — there we never spawn at all.
let child: ChildProcess | undefined;

function botsPaths() {
  const repoRoot = resolve(process.cwd(), ".."); // app/ sits under the repo root
  const botsDir = resolve(repoRoot, "bots");
  const tsx = resolve(botsDir, "node_modules/.bin/tsx");
  return { botsDir, tsx };
}

export async function POST() {
  if (child) return Response.json({ ok: true, started: true, already: true });

  const { botsDir, tsx } = botsPaths();
  if (!existsSync(tsx)) {
    // No bots workspace (e.g. production) — let the UI fall back to playback.
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  try {
    // Modest count keeps STT spend low; --interval paces one job at a time.
    const proc = spawn(tsx, ["orchestrator.ts", "--count=3", "--interval=4"], {
      cwd: botsDir,
      stdio: "ignore",
      env: process.env,
    });
    proc.on("exit", () => {
      if (child === proc) child = undefined;
    });
    proc.on("error", () => {
      if (child === proc) child = undefined;
    });
    child = proc;
    return Response.json({ ok: true, started: true });
  } catch {
    child = undefined;
    return Response.json({ ok: false, error: "spawn_failed" }, { status: 503 });
  }
}

export async function DELETE() {
  if (child) {
    child.kill("SIGINT"); // orchestrator has a SIGINT handler that tears down its children
    child = undefined;
  }
  return Response.json({ ok: true, stopped: true });
}
