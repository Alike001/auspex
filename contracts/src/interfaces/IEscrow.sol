// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  IEscrow
/// @notice The narrow surface AuspexResolver needs to settle a job. Each Escrow implements this.
interface IEscrow {
    /// @notice Apply a verdict + reasoning produced off-chain (by the agent composition).
    /// @dev    Reverts unless caller is the registered resolver and the escrow is in Delivered state.
    function applyVerdict(string calldata verdict, string calldata reasoning) external;
}
