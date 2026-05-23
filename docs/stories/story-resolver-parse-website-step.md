# Story — resolver-parse-website-step

**Epic:** Epic 1
**Depends on:** `story-resolver-json-api-step`
**Estimated:** 0.5 day
**Story slug:** `story-resolver-parse-website-step`

## Goal

Implement step 2 of AuspexResolver — `onMetadata` triggers an `IParseWebsiteAgent.ExtractString` call against the delivered URL. The parsed content is stored in `resolutions[requestId].parsedContent` and the state machine advances to `Step.ParsedDelivery`.

## Acceptance criteria (BDD)

```
Given a resolution at Step.FetchedMetadata after onMetadata success
When `onMetadata` continues execution
Then a createRequest is fired with agentId = PARSE_WEBSITE_AGENT_ID
And the payload encodes `IParseWebsiteAgent.ExtractString` with key="content", description="Main visible content of the delivered page", resolveUrl=false, numPages=1
And the prompt instructs the agent to extract main visible content focused on headings and primary copy
And resolutions[newRequestId] inherits the escrow address, briefURI, deliveryUrl

Given a pending resolution at Step.FetchedMetadata
When PLATFORM calls `onParsed(requestId, responses, ResponseStatus.Success, request)`
Then `resolutions[requestId].parsedContent` is set to the decoded response string
And `step` advances to `Step.ParsedDelivery`
And the next createRequest fires against LLM_AGENT_ID (next story)

Given a pending resolution
When PLATFORM calls `onParsed` with ResponseStatus.Failed
Then `IEscrow(escrow).applyVerdict("refunded", "Could not parse delivered page")` is called
And the resolution entry is deleted

Given the parsed content is empty string
When `onParsed` runs
Then the resolver short-circuits to refund with reasoning "Delivered page returned no content"

Given onParsed callback
When called by non-PLATFORM
Then it reverts with `OnlyPlatform()`
```

## File modification map

- `contracts/src/AuspexResolver.sol` — UPDATE — add `onMetadata` continuation + `onParsed` callback
- `contracts/test/AuspexResolver.t.sol` — UPDATE — add ≥ 4 new tests covering parse step (success, failure, empty content, access control)

## Shell verification

```bash
cd contracts
forge build
forge test --match-contract AuspexResolverTest -vvv | grep "passing"   # ≥ 8 total in this contract
forge test | tail -1                                                   # ≥ 20 total passing
```

## Out of scope

- ❌ LLM verdict call (next story)
- ❌ Reactivity wiring (later)
- ❌ Real platform integration
