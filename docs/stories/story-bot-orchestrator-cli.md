# Story — bot-orchestrator-cli

**Epic:** Epic 3
**Depends on:** `story-data-fetcher-bot`, `story-scraper-bot`
**Estimated:** 0.5 day
**Story slug:** `story-bot-orchestrator-cli`

## Goal

`bots/orchestrator.ts` spawns the scraper as a long-lived child, then runs the data-fetcher N times with delays, then shuts everything down cleanly. Used by the `/api/bot-trigger` route in Frontend #2.

## Acceptance criteria (BDD)

```
Given .env has both DATA_FETCHER_PRIVATE_KEY and SCRAPER_PRIVATE_KEY
When I run `pnpm bots:demo --count=3 --interval=4`
Then the scraper bot starts as a child process and logs "Scraper online"
And the data-fetcher posts 3 jobs with 4-second intervals
And the scraper handles each one (delivery + claim)
And after all 3 jobs are fully resolved + claimed, the orchestrator shuts down both children
And exit code is 0

Given `--count` not provided
When the orchestrator runs
Then it defaults to 1 cycle

Given the orchestrator
When SIGINT is received (Ctrl-C)
Then it sends SIGTERM to both children and exits 0 within 5 seconds

Given a child process crashes
When the orchestrator detects it
Then it logs `{ "event": "ChildCrashed", "process": "scraper", "code": N }`
And exits with code 3

Given `--log-file=runs/<runId>.jsonl`
When the orchestrator runs
Then all stdout from both children is tee'd to the log file (one JSON line per event)
And the file is created with parent dir if missing
```

## File modification map

- `bots/orchestrator.ts` — NEW — child process management + flag parsing
- `bots/shared/cli-args.ts` — NEW — shared CLI parsing helper
- `package.json` — UPDATE — add `bots:demo` script

## Shell verification

```bash
cd bots
pnpm typecheck

# Dry-run mode: spawn children with --dry-run themselves
pnpm tsx orchestrator.ts --count=2 --interval=1 --dry-run 2>&1 | grep -c '"event":"DryRun"'   # ≥ 2

# Trap test: confirm SIGINT cleans up
pnpm tsx orchestrator.ts --count=99 --interval=2 &
PID=$!
sleep 3
kill -INT $PID
wait $PID
[ $? -eq 0 ]   # exit 0 expected
```

## Out of scope

- ❌ Multi-pair orchestration (only data-fetcher × scraper in v1)
- ❌ Process monitor / restart-on-crash (just exit; demo will retry manually)
- ❌ Web UI for the orchestrator (Epic 4 covers UI wiring)
