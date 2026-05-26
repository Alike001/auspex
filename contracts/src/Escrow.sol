// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEscrow} from "./interfaces/IEscrow.sol";
import {IAuspexResolver} from "./interfaces/IAuspexResolver.sol";
import {SomniaConstants} from "./SomniaConstants.sol";

/// @title  Escrow
/// @notice Per-job escrow with a 4-state lifecycle. Deployed by EscrowFactory.
/// @dev    When `resolver` is address(0), submitDelivery auto-stubs the verdict to "released" /
///         "stubbed" (Issue #3 behaviour). When `resolver` is non-zero, the contract waits in
///         Delivered state until the resolver calls applyVerdict — subsequent stories wire this up.
contract Escrow is IEscrow {
    // ─────────── enums + errors + events ───────────

    enum State {
        Open,
        Delivered,
        Resolved,
        Claimed
    }

    error WrongState(State expected, State actual);
    error OnlyDeliverer();
    error OnlyResolver();
    error InvalidDelivery();
    error NotEntitled();
    error TransferFailed();
    error NoResolverConfigured();
    error InsufficientBalance(uint256 have, uint256 need);
    error AlreadyResolved();

    event JobDelivered(string deliveryUrl);
    event JobResolutionTriggered(address indexed resolver, uint256 requestId);
    event JobResolved(string verdict, string reasoning);
    event JobClaimed(address indexed receiver, uint256 amount);

    // ─────────── immutable parties + brief ───────────

    address public immutable client;
    address public immutable deliverer;
    address public immutable resolver;
    bytes32 public immutable briefHash;
    uint256 public immutable deadline;

    string  public briefURI;

    // ─────────── mutable runtime state ───────────

    State   public state;
    string  public deliveryUrl;
    string  public verdict;
    string  public reasoning;

    constructor(
        address _client,
        address _deliverer,
        address _resolver,
        bytes32 _briefHash,
        string memory _briefURI,
        uint256 _deadline
    ) payable {
        client = _client;
        deliverer = _deliverer;
        resolver = _resolver;
        briefHash = _briefHash;
        briefURI = _briefURI;
        deadline = _deadline;
        state = State.Open;
    }

    /// @notice Deliverer attaches a delivery URL. If the contract was deployed without a resolver,
    ///         the verdict is stubbed to "released" / "stubbed" in the same call.
    function submitDelivery(string calldata url) external {
        if (state != State.Open) revert WrongState(State.Open, state);
        if (msg.sender != deliverer) revert OnlyDeliverer();
        if (bytes(url).length == 0) revert InvalidDelivery();

        deliveryUrl = url;
        state = State.Delivered;
        emit JobDelivered(url);

        if (resolver == address(0)) {
            _applyVerdict("released", "stubbed");
        }
    }

    /// @notice Kick off the agent-arbitrated resolution. Forwards 0.36 STT (3 × DEPOSIT_PER_CALL)
    ///         to the configured resolver, which fires the JSON API agent and waits for callbacks.
    /// @dev    Anyone can call this — the State.Delivered guard is the access control.
    function resolve() external returns (uint256 requestId) {
        if (state != State.Delivered) revert WrongState(State.Delivered, state);
        if (resolver == address(0)) revert NoResolverConfigured();

        uint256 deposit = 3 * SomniaConstants.DEPOSIT_PER_CALL;
        if (address(this).balance < deposit) {
            revert InsufficientBalance(address(this).balance, deposit);
        }

        requestId = IAuspexResolver(resolver).startResolution{value: deposit}(
            address(this),
            briefURI,
            deliveryUrl
        );

        emit JobResolutionTriggered(resolver, requestId);
    }

    /// @inheritdoc IEscrow
    function applyVerdict(string calldata _verdict, string calldata _reasoning) external override {
        if (msg.sender != resolver) revert OnlyResolver();
        if (state == State.Resolved || state == State.Claimed) revert AlreadyResolved();
        if (state != State.Delivered) revert WrongState(State.Delivered, state);
        _applyVerdict(_verdict, _reasoning);
    }

    function _applyVerdict(string memory _verdict, string memory _reasoning) internal {
        verdict = _verdict;
        reasoning = _reasoning;
        state = State.Resolved;
        emit JobResolved(_verdict, _reasoning);
    }

    /// @notice After Resolved, the entitled party (deliverer for "released", client for "refunded") claims.
    function claim() external {
        if (state != State.Resolved) revert WrongState(State.Resolved, state);

        bytes32 v = keccak256(bytes(verdict));
        address receiver;
        if (v == keccak256(bytes("released"))) {
            receiver = deliverer;
        } else if (v == keccak256(bytes("refunded"))) {
            receiver = client;
        } else {
            revert NotEntitled();
        }

        if (msg.sender != receiver) revert NotEntitled();

        uint256 amount = address(this).balance;
        state = State.Claimed;
        emit JobClaimed(receiver, amount);

        (bool ok, ) = receiver.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
