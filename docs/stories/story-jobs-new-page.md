# Story — jobs-new-page

**Epic:** Epic 2
**Depends on:** `story-jobs-feed-page`
**Estimated:** 0.5 day
**Story slug:** `story-jobs-new-page`

## Goal

Implement `/jobs/new` — the post-a-job form. Client fills brief, deliverer address, amount, deadline. On submit: writes brief JSON to a hosted endpoint (return URI), computes hash, calls `EscrowFactory.createJob`. On success, redirects to `/jobs/[address]`.

## Acceptance criteria (BDD)

```
Given the wallet is connected
When I navigate to /jobs/new
Then a form renders with fields: Brief (textarea), Deliverer wallet (text), Amount (number), Deadline (datetime-local)
And the bottom strip shows "Total locked: 0.00 STT · Resolution budget: 0.36 STT (3 × 0.12)"

Given the wallet is NOT connected
When I navigate to /jobs/new
Then I see a centered card with "Connect your wallet to post a job" + a ConnectButton

Given valid form input (brief 50 chars, valid 0x address, amount 5.00, deadline 24h from now)
When I click "Post job"
Then the brief is POSTed to /api/briefs and a `briefURI` returned
And the brief is hashed via keccak256
And `EscrowFactory.createJob(briefHash, briefURI, deliverer, deadline)` fires via wagmi `writeContract` with msg.value = amount + 0.36
And a toast renders: "Job posted. Brief hash 0x…ab12. Awaiting delivery."
And the user is redirected to `/jobs/[new-escrow-address]`

Given a brief shorter than 20 chars
When I submit
Then a field-level error "Brief must be at least 20 characters" prevents submit

Given a brief longer than 1000 chars
When I submit
Then a field-level error "Brief must be at most 1000 characters" prevents submit

Given an invalid deliverer address (not 0x...)
When I submit
Then a field-level error "Invalid address" prevents submit

Given amount = 0 or > wallet balance - 0.36
When I submit
Then a field-level error prevents submit

Given the transaction is in flight
When I check the button state
Then it shows "Posting…" with a spinner
And the button is disabled until the tx resolves

Given the wallet rejects the transaction
When the reject fires
Then a toast renders: "Wallet rejected the transaction."
And the form remains populated
```

## File modification map

- `app/app/jobs/new/page.tsx` — NEW — server shell + client form
- `app/app/jobs/new/PostJobForm.tsx` — NEW — client component (form + validation + wagmi write)
- `app/app/api/briefs/route.ts` — NEW — POST handler that stores briefs (v1: in-memory or KV; v2 IPFS) and returns a URI
- `app/lib/briefs.ts` — NEW — keccak256 hash + URI helpers
- `app/components/ui/textarea.tsx` — NEW (shadcn)
- `app/components/ui/input.tsx` — NEW (shadcn)
- `app/components/ui/label.tsx` — NEW (shadcn)

## Shell verification

```bash
cd app
pnpm typecheck
pnpm lint
pnpm build
pnpm dev &
sleep 5

curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/jobs/new   # 200
curl -s http://localhost:3000/jobs/new | grep -E "Post a job|Brief"

# Brief POST endpoint exists
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"text":"This is a valid 20+ character brief for testing"}' \
  http://localhost:3000/api/briefs | grep -q "uri"

kill %1
```

## Out of scope

- ❌ Brief storage in IPFS (v2; use ephemeral hosted brief for v1)
- ❌ Brief uniqueness / collision checks
- ❌ Multi-deliverer briefs (open bidding) — v2
