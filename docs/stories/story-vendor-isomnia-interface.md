# Story — vendor-isomnia-interface

**Epic:** Epic 1
**Depends on:** `story-hardhat-foundry-scaffold`
**Estimated:** 0.25 day
**Story slug:** `story-vendor-isomnia-interface`

## Goal

Vendor `ISomniaAgents.sol` from `Kali-Decoder/Somnia-Agentic-examples` into `contracts/src/interfaces/` and confirm it compiles. This unblocks the resolver work — every agent call references this file.

## Acceptance criteria (BDD)

```
Given the Kali-Decoder reference repo
When I copy `contracts/interfaces/ISomniaAgents.sol` into `contracts/src/interfaces/ISomniaAgents.sol`
Then the file content matches `sdk-snippets.md` §1 byte-for-byte (interface declarations)

Given the vendored file
When I run `forge build`
Then exit code is 0 and ISomniaAgents.sol is reported in `out/`

Given the vendored file
When I grep for `interface IAgentRequester`, `interface IJsonApiAgent`, `interface ILLMAgent`, `interface IParseWebsiteAgent`, `enum ConsensusType`, `enum ResponseStatus`, `struct Response`, `struct Request`
Then all 8 symbols are present

Given Constants for testnet platform + agent IDs
When I create a `contracts/src/SomniaConstants.sol` file
Then it declares: PLATFORM_TESTNET = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776, JSON_API_AGENT_ID = 13174292974160097713, LLM_AGENT_ID = 12847293847561029384, PARSE_WEBSITE_AGENT_ID = 12875401142070969085, DEPOSIT_PER_CALL = 12e16
```

## File modification map

- `contracts/src/interfaces/ISomniaAgents.sol` — NEW — vendored from Kali-Decoder examples (full file per `sdk-snippets.md` §1)
- `contracts/src/SomniaConstants.sol` — NEW — testnet addresses + agent IDs + deposit constants
- `contracts/test/SomniaConstants.t.sol` — NEW — 1 test asserting constants match expected values

## Shell verification

```bash
cd contracts
forge build
grep -E "interface IAgentRequester|interface IJsonApiAgent|interface ILLMAgent|interface IParseWebsiteAgent" src/interfaces/ISomniaAgents.sol | wc -l   # must be ≥ 4
grep -E "enum ConsensusType|enum ResponseStatus" src/interfaces/ISomniaAgents.sol | wc -l   # must be 2
forge test --match-contract SomniaConstantsTest   # 1 passing
```

## Out of scope

- ❌ Using the interface (next stories will)
- ❌ Mocking platform calls (Epic 1 last story)
- ❌ Adding `@somnia-chain/*` npm packages — vendor the .sol file directly
