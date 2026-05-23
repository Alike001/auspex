# Story — resolver-llm-judge-step

**Epic:** Epic 1
**Depends on:** `story-resolver-parse-website-step`
**Estimated:** 0.75 day
**Story slug:** `story-resolver-llm-judge-step`

## Goal

Implement step 3 — the LLM Inference verdict call. `onParsed` triggers `ILLMAgent.inferString` with `allowedValues = ["released", "refunded"]`. The callback `onJudgment` calls `Escrow.applyVerdict(verdict, reasoning)`. This story closes the agent composition loop and makes `Escrow.applyVerdict` callable from the resolver only.

## Acceptance criteria (BDD)

```
Given a resolution at Step.ParsedDelivery
When `onParsed` continues execution
Then a createRequest fires against LLM_AGENT_ID
And the payload encodes `ILLMAgent.inferString` with:
  - prompt containing "Brief URI:", the briefURI, "Delivered content extracted from URL:", the parsedContent
  - system = "You are Auspex, an impartial arbiter..." (per architecture.md §4.2)
  - chainOfThought = false
  - allowedValues = ["released", "refunded"]

Given a pending resolution at Step.ParsedDelivery
When PLATFORM calls `onJudgment` with ResponseStatus.Success and result encoding "released"
Then `IEscrow(escrow).applyVerdict("released", reasoning)` is called
And reasoning = string.concat("Verdict: released · Evidence: ", parsedContent)
And `resolutions[requestId]` is deleted

Given a pending resolution
When `onJudgment` returns "refunded"
Then `applyVerdict("refunded", reasoning)` is called

Given a pending resolution
When `onJudgment` is called with ResponseStatus.Failed
Then `applyVerdict("refunded", "LLM judge timed out — defaulting to refund")` is called

Given Escrow.applyVerdict
When called by a non-resolver address
Then it reverts with `OnlyResolver()`

Given an Escrow in state Resolved
When applyVerdict is called again
Then it reverts with `AlreadyResolved()`

Given onJudgment callback
When called by non-PLATFORM
Then it reverts with `OnlyPlatform()`
```

## File modification map

- `contracts/src/AuspexResolver.sol` — UPDATE — add `onParsed` continuation + `onJudgment` callback
- `contracts/src/Escrow.sol` — UPDATE — add `applyVerdict(string,string)` external, restricted to AuspexResolver address
- `contracts/test/AuspexResolver.t.sol` — UPDATE — add ≥ 5 new tests covering verdict step (released, refunded, timeout, double-apply, access control)
- `contracts/test/Escrow.t.sol` — UPDATE — add ≥ 2 new tests for applyVerdict access control + double-call

## Shell verification

```bash
cd contracts
forge build
forge test --match-contract AuspexResolverTest -vvv | grep "passing"   # ≥ 13 total in this contract
forge test --match-contract EscrowTest -vvv | grep "passing"           # ≥ 10 total in this contract
forge test | tail -1                                                   # ≥ 28 total passing
```

## Out of scope

- ❌ Reactivity subscription (optional — agent callbacks already provide same-block dispatch on Shannon)
- ❌ Multi-validator threshold mode (v2)
- ❌ Free-form reasoning prose via inferChat (v2)
- ❌ Real platform integration (next story does live testnet)
