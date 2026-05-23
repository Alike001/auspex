# Story — top-up-forge-tests

**Epic:** Epic 5 — Forge tests + polish + demo + submission
**Depends on:** `story-resolver-llm-judge-step`
**Estimated:** 0.75 day
**Story slug:** `story-top-up-forge-tests`

## Goal

Raise the Forge test count from ~28 (after Epic 1) to ≥ 30 with high-signal edge case + invariant tests. Add a property-based test on Escrow state machine using Forge invariant testing. CI must run all tests on every PR.

## Acceptance criteria (BDD)

```
Given the full test suite
When I run `forge test`
Then ≥ 30 tests pass
And 0 tests fail or skip

Given the EscrowFactory test contract
When I run `forge test --match-contract EscrowFactoryTest`
Then ≥ 5 tests pass covering: creation, indexing by client, indexing by deliverer, fee math, event emission

Given the Escrow test contract
When I run `forge test --match-contract EscrowTest`
Then ≥ 10 tests pass covering: state transitions (Open → Delivered → Resolved → Claimed), access control (deliverer-only submitDelivery, resolver-only applyVerdict, winner-only claim), invalid inputs, refund flow, double-claim revert

Given the AuspexResolver test contract
When I run `forge test --match-contract AuspexResolverTest`
Then ≥ 13 tests pass covering: each agent step (3) × (success, failure, access control) ≈ 9 + 4 cross-step tests

Given an invariant test
When I run `forge test --match-test invariant_`
Then ≥ 2 invariants hold: (1) "Total Escrow contract balance never exceeds locked amounts of un-claimed jobs", (2) "An Escrow can never reach Claimed without first being Resolved"

Given .github/workflows/contracts.yml
When I push a PR
Then GitHub Actions runs `forge build`, `forge test -vvv`, and `forge fmt --check`
And the job fails if any of those exit non-zero
```

## File modification map

- `contracts/test/EscrowFactory.t.sol` — UPDATE — add cases to reach ≥ 5
- `contracts/test/Escrow.t.sol` — UPDATE — add cases to reach ≥ 10
- `contracts/test/AuspexResolver.t.sol` — UPDATE — add cross-step tests to reach ≥ 13
- `contracts/test/invariants/EscrowInvariants.t.sol` — NEW — Forge invariant suite
- `.github/workflows/contracts.yml` — NEW — CI workflow

## Shell verification

```bash
cd contracts
forge test -vvv | tail -20 | grep -E "tests passed"
TOTAL=$(forge test 2>&1 | grep -oE "[0-9]+ tests passed" | head -1 | grep -oE "[0-9]+")
[ "$TOTAL" -ge 30 ] || (echo "Need ≥ 30 tests, got $TOTAL"; exit 1)

forge fmt --check
```

## Out of scope

- ❌ Fuzz testing beyond Forge defaults
- ❌ Slither static analysis (best-effort, non-blocking)
- ❌ Coverage report polish — `forge coverage` is bonus, not gating
