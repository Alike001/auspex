// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  SomniaConstants
/// @notice Testnet addresses + agent IDs + per-call deposit for the Somnia base-agent platform.
/// @dev    Sourced from sdk-snippets.md §1 (Somnia Agentathon 2026 — Shannon testnet, chainId 50312).
library SomniaConstants {
    address internal constant PLATFORM_TESTNET = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;

    uint256 internal constant JSON_API_AGENT_ID = 13174292974160097713;
    uint256 internal constant LLM_AGENT_ID = 12847293847561029384;
    uint256 internal constant PARSE_WEBSITE_AGENT_ID = 12875401142070969085;

    // 0.5 STT per agent call. Was 12e16 (0.12) — too low: the LLM-backed Parse
    // Website + Inference agents need ~0.30 execution budget (≈0.10/validator × 3),
    // so 0.12 failed every Parse Website call with status `insufficient_budget`.
    // Confirmed 2026-06-01 from the agent receipt: "insufficient budget for execution cost".
    uint256 internal constant DEPOSIT_PER_CALL = 5e17;
}
