# Story — vercel-production-deploy

**Epic:** Epic 5
**Depends on:** `story-final-deploy-shannon`
**Estimated:** 0.25 day
**Story slug:** `story-vercel-production-deploy`

## Goal

Promote the Next.js app to a production Vercel URL with the final Shannon addresses pinned. Confirm both routes (`/jobs` and `/bots`) work end-to-end against live contracts. This URL is the canonical demo link in the submission.

## Acceptance criteria (BDD)

```
Given the GitHub repo is connected to Vercel
When I push to `main`
Then Vercel builds and deploys the app/ workspace
And the deployment exits with status "Ready"

Given the production URL (e.g. https://auspex.vercel.app or custom domain)
When I visit /jobs
Then the page renders without console errors
And it reads jobs from the deployed EscrowFactory on Shannon
And status code is 200

Given the production URL
When I visit /bots
Then playback mode starts automatically
And the canonical 60s sequence renders without errors

Given Vercel project settings
When I check environment variables
Then NEXT_PUBLIC_SOMNIA_RPC, NEXT_PUBLIC_SOMNIA_WS, NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_ESCROW_FACTORY, NEXT_PUBLIC_AUSPEX_RESOLVER, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID are all set in production

Given an OpenGraph image
When I share the production URL on Twitter/X
Then a 1200×630 OG image renders showing "Auspex · Agent-arbitrated escrow on Somnia"

Given a Lighthouse run against /jobs and /bots
When measured on desktop
Then performance ≥ 85, accessibility ≥ 95, best-practices ≥ 90 for both
```

## File modification map

- `app/app/opengraph-image.tsx` — NEW — Next.js auto-generated OG image
- `app/next.config.ts` — UPDATE — production config (no telemetry, no powered-by header)
- `vercel.json` — NEW (optional) — explicit build settings for the app workspace
- README placeholder — UPDATE — link to production deploy URL (final README in next story)

## Shell verification

```bash
# Local pre-flight
cd app
pnpm typecheck
pnpm lint
pnpm build

# After Vercel deploy completes (URL provided by CI):
DEPLOY_URL=$(cat /tmp/deploy-url)   # populated by deploy step
curl -s -o /dev/null -w "%{http_code}" $DEPLOY_URL/jobs   # 200
curl -s -o /dev/null -w "%{http_code}" $DEPLOY_URL/bots   # 200

# OG image
curl -s -o /dev/null -w "%{http_code}" $DEPLOY_URL/opengraph-image   # 200
```

## Out of scope

- ❌ Custom domain purchase (use auspex.vercel.app default)
- ❌ Multi-region deploy
- ❌ A/B testing setup
- ❌ Analytics beyond Vercel's built-in Web Analytics
