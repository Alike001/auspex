/**
 * Structured JSON logger — one compact JSON object per line on stdout, so an
 * orchestrator (story-bot-orchestrator-cli) or a recording step can consume the
 * stream line-by-line. The `event` key always comes first by convention.
 */
export type LogEvent = { event: string } & Record<string, unknown>;

/** Emit one structured log line. Compact (no spaces) so `grep '"event":"X"'` works. */
export function log(event: LogEvent): void {
  process.stdout.write(JSON.stringify(event) + "\n");
}
