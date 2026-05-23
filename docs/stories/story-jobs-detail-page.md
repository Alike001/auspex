# Story — jobs-detail-page

**Epic:** Epic 2 (closing)
**Depends on:** `story-jobs-new-page`, `story-reasoning-trace-component`
**Estimated:** 1 day
**Story slug:** `story-jobs-detail-page`

## Goal

Implement `/jobs/[id]` — the full job detail screen per ux-spec §6.3. Two-panel layout: BRIEF + DELIVERED URL on the left, REASONING on the right. Shows verdict + reasoning. Lets the deliverer submit a delivery. Lets the winning party claim their payout/refund.

## Acceptance criteria (BDD)

```
Given a valid escrow address in the URL `/jobs/0x...`
When the page loads
Then it reads the escrow's public state (client, deliverer, amount, briefHash, briefURI, state, deliveryUrl, verdict, reasoning)
And displays the brief content (fetched from briefURI)
And displays both AgentChips with their roles labelled

Given the escrow state is Open
When the viewer is the deliverer
Then a "Submit delivery" CTA renders in the Delivered URL panel
And clicking it opens a modal with a URL input + submit button

Given the deliverer submits a URL via the modal
When the form submits
Then `Escrow.submitDelivery(url)` writes via wagmi
And the modal closes
And the StatusPill changes to "Judging…"
And the ReasoningTrace shows 3 placeholder rows with pulsing dots

Given the escrow state is Delivered or Resolved
When the page renders
Then the DeliveryPreview shows an iframe of the delivered URL
And the iframe error state activates if framing is blocked

Given the escrow state is Resolved with verdict = "released"
When the page renders
Then the ReasoningTrace shows all 3 steps with the verdict step's diamond in `text-accent`
And the StatusPill shows "RELEASED"
And if viewer is the deliverer, a "Claim payout" CTA is visible

Given the deliverer clicks "Claim payout"
When `Escrow.claim()` succeeds
Then the StatusPill changes to "PAID"
And a toast renders: "Payout claimed."

Given the escrow state is Resolved with verdict = "refunded"
When the viewer is the client
Then a "Claim refund" CTA is visible
And clicking it calls `claim()`
And the StatusPill changes to "REFUNDED" upon completion (already shown; the claim moves it to a paid/refunded final state)

Given the page is loading
When the initial render fires
Then skeleton placeholders render for: brief panel, delivered URL panel, reasoning panel

Given the URL contains an invalid escrow address (not a contract)
When the page loads
Then it shows a "Job not found" empty state with a [Back to feed] CTA
```

## File modification map

- `app/app/jobs/[id]/page.tsx` — NEW — server shell + dynamic params
- `app/app/jobs/[id]/JobDetail.tsx` — NEW — client component
- `app/app/jobs/[id]/SubmitDeliveryModal.tsx` — NEW — modal with URL input
- `app/app/jobs/[id]/ClaimButton.tsx` — NEW — conditional CTA based on viewer + state
- `app/components/ui/dialog.tsx` — NEW (shadcn)
- `app/lib/auspex.ts` — UPDATE — add `readEscrowState`, `submitDelivery`, `claim` wrappers
- `app/lib/briefs.ts` — UPDATE — add `fetchBriefByURI`

## Shell verification

```bash
cd app
pnpm typecheck
pnpm lint
pnpm build
pnpm dev &
sleep 5

# Valid escrow address (assume sample escrow from E2E demo at known address)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/jobs/0x0000000000000000000000000000000000000001"   # 200

# Invalid address fallback
curl -s "http://localhost:3000/jobs/not-an-address" | grep -q "Job not found"

kill %1
```

## Out of scope

- ❌ Dispute flow / appeal (v2)
- ❌ Editing a brief after posting (v2)
- ❌ Receipt deep-dive modal (v2)
- ❌ Real-time block height pulse (covered by Epic 4 or polish)
