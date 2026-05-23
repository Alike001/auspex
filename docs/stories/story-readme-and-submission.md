# Story — readme-and-submission

**Epic:** Epic 5 (closing — sprint final)
**Depends on:** `story-demo-video-shoot-edit`, `story-vercel-production-deploy`, `story-top-up-forge-tests`
**Estimated:** 0.5 day
**Story slug:** `story-readme-and-submission`

## Goal

Run the `portfolio-readme-writer` skill (hackathon-mode) to produce the README. Update Encode submission with: final repo URL, demo video URL, production deploy URL, deployed contract addresses, brief description. Submit before 2026-06-10 23:59 GMT+1.

## Acceptance criteria (BDD)

```
Given the project state at sprint close
When `portfolio-readme-writer` is invoked in hackathon mode
Then `README.md` is written at the repo root
And it contains all sections from PRD §14: title, pitch, demo link, demo video link, architecture diagram, deployed addresses, run-bot-demo instructions, Forge test results, future work, builder section, license

Given the README
When I `grep -c` for required sections
Then it contains: # Auspex, ## Demo, ## Architecture, ## Run locally, ## Tests, ## Future work, ## Builder, ## License

Given the architecture section
When I read it
Then it embeds either the ASCII diagram from architecture.md §4.1 OR a linked image
And it lists deployed contract addresses with explorer links

Given the run-locally section
When I read it
Then it provides: clone command, pnpm install, env setup (link to .env.example), pnpm run dev, pnpm run demo:e2e, pnpm bots:demo

Given the Encode portal submission form
When I fill it
Then the project description references "agent-arbitrated escrow" (NOT "prediction market")
And the demo link points to the Vercel production URL
And the demo video link points to the unlisted YouTube/Loom URL
And the repo link is https://github.com/Alike001/auspex

Given the LICENSE file
When I read it
Then it is the MIT License with Hammed Ali Oyeleye as copyright holder

Given the submission deadline of 2026-06-10 23:59 GMT+1
When the submission lands
Then it is timestamped before 2026-06-10 22:00 GMT+1 (1-hour safety buffer)
```

## File modification map

- `README.md` — REWRITE via `portfolio-readme-writer`
- `LICENSE` — NEW — MIT
- `.github/PULL_REQUEST_TEMPLATE.md` — NEW (optional)
- `docs/sprint-status.yaml` — UPDATE — flip all story status to COMPLETE
- Encode portal — external — manual submission

## Shell verification

```bash
# README content checks
grep -c "^## Demo" README.md         # ≥ 1
grep -c "^## Architecture" README.md # ≥ 1
grep -c "^## Run locally" README.md  # ≥ 1
grep -c "^## Tests" README.md        # ≥ 1
grep -c "^## Future work" README.md  # ≥ 1
grep -c "^## Builder" README.md      # ≥ 1
grep -c "^## License" README.md      # ≥ 1

# Demo link works
DEMO_URL=$(grep -oE 'https://[^ ]*vercel.app[^ ]*' README.md | head -1)
curl -s -o /dev/null -w "%{http_code}" $DEMO_URL   # 200

# Video link works
VIDEO_URL=$(grep -oE 'https://(youtu\.be|loom\.com|youtube\.com)[^ )]*' README.md | head -1)
curl -s -o /dev/null -w "%{http_code}" $VIDEO_URL   # 200

# Deployed addresses are present
grep -cE "0x[a-fA-F0-9]{40}" README.md   # ≥ 2

# License is MIT
grep "MIT License" LICENSE
grep "Hammed Ali Oyeleye" LICENSE
```

## Out of scope

- ❌ Marketing site (the app IS the marketing site in v1)
- ❌ Long-form blog post (do this AFTER submission lands)
- ❌ Twitter / X thread (queue for finale-day, NOT a submission requirement)
- ❌ Mainnet announcement (v2 once contracts are audited)
