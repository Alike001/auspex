# Story — resolver-json-api-step

**Epic:** Epic 1
**Depends on:** `story-escrow-factory-skeleton`
**Estimated:** 0.75 day
**Story slug:** `story-resolver-json-api-step`

## Goal

Implement `AuspexResolver.sol` step 1 — the JSON API agent call that verifies the delivered URL is reachable. Wire `Escrow.resolve()` to call `AuspexResolver.startResolution(briefURI, deliveryUrl)`. The resolver stores per-request state and waits for the callback. Use a mocked platform in tests; real platform only hit in `story-cli-e2e-demo`.

## Acceptance criteria (BDD)

```
Given a deployed AuspexResolver with the Somnia platform address constant
When I call `startResolution(escrow, briefURI, deliveryUrl)` with msg.value ≥ 0.36 STT
Then a `createRequest` call is made against PLATFORM with agentId = JSON_API_AGENT_ID
And the callback selector encoded matches `this.onMetadata.selector`
And the payload encodes `IJsonApiAgent.fetchString` with the URL metadata check
And `resolutions[requestId].step` is set to `Step.None`

Given a pending resolution at Step.None
When PLATFORM calls `onMetadata(requestId, responses, ResponseStatus.Success, request)`
Then `resolutions[requestId].step` advances to `Step.FetchedMetadata`
And a second `createRequest` call fires against PARSE_AGENT_ID (next story wires this)
And the original resolution entry is deleted; new entry created under new requestId

Given a pending resolution
When PLATFORM calls `onMetadata` with ResponseStatus.Failed
Then the resolver calls `IEscrow(escrow).applyVerdict("refunded", "URL unreachable")`
And the original resolution entry is deleted

Given an Escrow in state Delivered
When `Escrow.resolve()` is called
Then it delegates to `AuspexResolver.startResolution` with the escrow's stored briefURI + deliveryUrl
And forwards exactly 0.36 STT (3 × 0.12)

Given Escrow.resolve()
When called by a non-Escrow contract
Then it reverts with `OnlyEscrow()`
```

## File modification map

- `contracts/src/AuspexResolver.sol` — NEW — JSON API step + state machine scaffolding
- `contracts/src/Escrow.sol` — UPDATE — replace stub `resolve()` with delegation to AuspexResolver
- `contracts/test/AuspexResolver.t.sol` — NEW — ≥ 4 tests using MockAgentPlatform
- `contracts/test/mocks/MockAgentPlatform.sol` — NEW — Mocks `createRequest`, allows test to drive `onMetadata` directly

## Shell verification

```bash
cd contracts
forge build
forge test --match-contract AuspexResolverTest -vvv | grep "passing"   # ≥ 4
forge test | tail -1                                                   # ≥ 16 total passing
```

## Out of scope

- ❌ Parse Website call (next story)
- ❌ LLM Inference call (next story)
- ❌ Real platform integration (Epic 5 story `story-final-deploy-shannon`)
- ❌ Reactivity subscription (later)
