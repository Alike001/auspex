# Story — jobs-feed-page

**Epic:** Epic 2
**Depends on:** `story-rainbowkit-wallet`, `story-signature-components`, `story-cli-e2e-demo` (needs deployed factory address)
**Estimated:** 0.75 day
**Story slug:** `story-jobs-feed-page`

## Goal

Implement `/jobs` route — the job feed. Reads `JobCreated` + `JobResolved` events from `EscrowFactory` via wagmi `useReadContract` + `useWatchContractEvent`. Renders a list of `JobCard` rows. New jobs appear without page reload.

## Acceptance criteria (BDD)

```
Given the deployed EscrowFactory address is in NEXT_PUBLIC_ESCROW_FACTORY
When I navigate to /jobs
Then the page reads existing jobs from `factory.allJobs()`
And renders each as a JobCard sorted newest-first by createdAt

Given no jobs exist yet
When the page loads
Then the empty state renders: "No jobs yet. Post the first one." + a primary CTA "+ Post a job"

Given existing jobs
When I view the feed
Then each JobCard shows: status dot, brief excerpt (first 80 chars), client + deliverer AgentChips, StatusPill, timestamp, amount in STT, divider

Given a new job is created on-chain
When `JobCreated` event arrives via watch
Then a new JobCard slides into the top of the list within 1 second

Given a job's status changes (e.g. JobResolved)
When the event arrives
Then the corresponding JobCard's StatusPill updates without page reload

Given the page is loading (initial fetch)
When the component first renders
Then 6 skeleton JobCards appear
And real data fades in over 120ms once the first read resolves

Given the user clicks a JobCard
When the click handler fires
Then they are navigated to `/jobs/[escrow-address]`

Given the user clicks "+ Post a job"
When the click fires
Then they are navigated to `/jobs/new`

Given the wallet is not connected
When the user views /jobs
Then the feed still renders (read-only access works)
And the "+ Post a job" button is disabled with tooltip "Connect wallet to post"
```

## File modification map

- `app/app/jobs/page.tsx` — NEW — server component shell + client component for live data
- `app/app/jobs/JobsFeed.tsx` — NEW — client component with wagmi hooks
- `app/app/jobs/JobsEmpty.tsx` — NEW — empty state
- `app/lib/auspex.ts` — NEW — typed contract client (reads `factory.allJobs()`, decodes Escrow.publicState)
- `app/lib/contracts.ts` — NEW — ABI + address exports
- `app/app/page.tsx` — UPDATE — redirect `/` → `/jobs`

## Shell verification

```bash
cd app
pnpm typecheck
pnpm lint
pnpm build
pnpm dev &
sleep 5

# Page exists
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/jobs   # 200

# Page contains expected strings
curl -s http://localhost:3000/jobs | grep -E "Jobs|Post a job"

# Empty state when no jobs (assumes fresh factory)
curl -s http://localhost:3000/jobs | grep -q "No jobs yet"

kill %1
```

## Out of scope

- ❌ Posting a job (next story)
- ❌ Job detail view (story after next)
- ❌ Filtering / search
- ❌ Pagination — v1 ships unbounded list (10-20 jobs max in demo)
