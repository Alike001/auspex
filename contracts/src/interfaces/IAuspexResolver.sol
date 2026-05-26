// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title  IAuspexResolver
/// @notice Narrow surface Escrow uses to hand off resolution work to AuspexResolver.
interface IAuspexResolver {
    /// @notice Kick off the 3-step agent composition that decides "released" vs "refunded".
    /// @dev    msg.value must be at least 3 × DEPOSIT_PER_CALL (0.36 STT on testnet).
    ///         Resolver requires msg.sender == escrow.
    /// @return requestId  Identifier of the first (JSON API) agent request.
    function startResolution(
        address escrow,
        string calldata briefURI,
        string calldata deliveryUrl
    ) external payable returns (uint256 requestId);
}
