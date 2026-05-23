# Story — canonical-60s-recording

**Epic:** Epic 3 (closing)
**Depends on:** `story-bot-orchestrator-cli`
**Estimated:** 0.25 day
**Story slug:** `story-canonical-60s-recording`

## Goal

Run the orchestrator once with `--record` to capture a canonical 60-second sequence of 12 bot-to-bot jobs into `app/public/demo/canonical-60s.json`. This file powers Frontend #2's playback mode when no live demo is running.

## Acceptance criteria (BDD)

```
Given a successful end-to-end demo run on Shannon
When I run `pnpm bots:demo --count=12 --interval=4 --record=app/public/demo/canonical-60s.json`
Then the orchestrator captures every event with timestamp offsets
And writes the result to `app/public/demo/canonical-60s.json`

Given the canonical-60s.json file
When I read it
Then it is valid JSON parseable as an array of frames
And each frame has shape `{ atMs: number, type: string, payload: object }`
And there are ≥ 12 frames of type "JobCreated"
And there are ≥ 12 frames of type "JobResolved"
And the maximum `atMs` is between 55_000 and 65_000

Given a frame of type "JobResolved"
When I inspect its payload
Then `verdict` is one of "released" | "refunded"
And `reasoning` is a non-empty string
And `txHash` is a 0x-prefixed 66-char string

Given an audit of the file
When I count event types
Then there are 3 "AgentStep" frames per "JobResolved" (one each for json-api, parse-website, llm-judge)
```

## File modification map

- `bots/orchestrator.ts` — UPDATE — add `--record=<path>` flag that captures events
- `app/public/demo/canonical-60s.json` — NEW — the recorded sequence (will be regenerated as needed during development)

## Shell verification

```bash
cd <repo-root>

# After orchestrator records:
test -f app/public/demo/canonical-60s.json
jq '. | length' app/public/demo/canonical-60s.json   # ≥ 48 (12 jobs × 4 events each)
jq '[.[] | select(.type=="JobCreated")] | length' app/public/demo/canonical-60s.json   # ≥ 12
jq '[.[] | select(.type=="JobResolved")] | length' app/public/demo/canonical-60s.json   # ≥ 12
jq '[.[].atMs] | max' app/public/demo/canonical-60s.json   # 55000 < x < 65000
```

## Out of scope

- ❌ Re-recording during the demo video shoot (the recording is locked once Epic 3 closes)
- ❌ Multiple canonical recordings (one is enough; record a backup if Shannon is flaky)
- ❌ Editing the JSON manually
