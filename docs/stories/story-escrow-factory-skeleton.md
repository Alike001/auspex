# Story — escrow-factory-skeleton

**Epic:** Epic 1
**Depends on:** `story-vendor-isomnia-interface`
**Estimated:** 1 day
**Story slug:** `story-escrow-factory-skeleton`

## Goal

Implement `EscrowFactory.sol` and `Escrow.sol` with the full state machine (Open → Delivered → Resolved → Claimed) but WITHOUT the agent composition wired. `resolve()` is a no-op for now (immediately calls `applyVerdict("released", "stubbed")`). This lets the factory + per-job contracts + state transitions + Forge tests land first, decoupling them from the agent call work in subsequent stories.

## Acceptance criteria (BDD)

```
Given a deployed EscrowFactory
When I call `createJob(briefHash, briefURI, deliverer, deadline)` with msg.value = 5 STT
Then a new Escrow contract is deployed
And `JobCreated(escrow, client, deliverer, amount, briefHash)` is emitted
And the escrow's `state` getter returns `State.Open`
And `factory.allJobs()` returns an array containing the new escrow address
And `factory.jobsByClient(msg.sender)` includes the new escrow

Given an Escrow in state Open
When the deliverer calls `submitDelivery("https://example.com/delivery")`
Then `state` transitions to `State.Delivered`
And `deliveryUrl` returns "https://example.com/delivery"
And `JobDelivered(deliveryUrl)` is emitted
And `resolve()` is called internally (stubbed)

Given an Escrow with stubbed `resolve()` returning "released"
When `submitDelivery` runs to completion
Then `state` transitions to `State.Resolved`
And `verdict` returns "released"
And `reasoning` returns "stubbed"
And `JobResolved(verdict, reasoning)` is emitted

Given an Escrow in state Resolved with verdict "released"
When the deliverer calls `claim()`
Then `state` transitions to `State.Claimed`
And the deliverer's balance increases by the locked amount
And `JobClaimed(receiver, amount)` is emitted

Given an Escrow in state Resolved with verdict "refunded"
When the client calls `claim()`
Then the client's balance increases by the locked amount
And `JobClaimed(receiver, amount)` is emitted

Given an Escrow in state Open
When a non-deliverer calls `submitDelivery`
Then the call reverts with `OnlyDeliverer()`

Given an Escrow in state Open
When the deliverer calls `submitDelivery("")` (empty URL)
Then the call reverts with `InvalidDelivery()`

Given an Escrow in state Resolved with verdict "released"
When the client (not deliverer) calls `claim()`
Then the call reverts with `NotEntitled()`
```

## File modification map

- `contracts/src/EscrowFactory.sol` — NEW — factory with `createJob` + indexing arrays
- `contracts/src/Escrow.sol` — NEW — per-job escrow with state machine; `resolve()` stub
- `contracts/src/interfaces/IEscrow.sol` — NEW — applyVerdict signature for the resolver to call later
- `contracts/test/EscrowFactory.t.sol` — NEW — ≥ 4 tests covering creation + indexing
- `contracts/test/Escrow.t.sol` — NEW — ≥ 8 tests covering state machine + access control + invalid inputs

## Shell verification

```bash
cd contracts
forge build
forge test --match-contract EscrowFactoryTest -vvv | grep "passing"     # ≥ 4
forge test --match-contract EscrowTest -vvv | grep "passing"            # ≥ 8
forge test | tail -1   # final summary shows ≥ 12 passing
```

## Out of scope

- ❌ Wiring AuspexResolver / agent calls (next 3 stories)
- ❌ Reactivity subscription (later story)
- ❌ Deploying to testnet (Epic 5)
- ❌ Frontend wiring (Epic 2)
