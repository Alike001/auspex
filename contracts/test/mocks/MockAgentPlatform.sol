// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IAgentRequester,
    ConsensusType,
    Request,
    Response,
    ResponseStatus
} from "../../src/interfaces/ISomniaAgents.sol";

/// @title  MockAgentPlatform
/// @notice Test double for Somnia's agent platform. Records every createRequest call and
///         exposes simulateCallback so tests can drive the async response synchronously.
contract MockAgentPlatform is IAgentRequester {
    struct CapturedRequest {
        uint256 agentId;
        address callbackAddress;
        bytes4  callbackSelector;
        bytes   payload;
        uint256 perAgentBudget;
    }

    // Slot 0 is intentionally unused so requestId always starts at 1.
    CapturedRequest[] private _requests;
    uint256 public requestCount;

    constructor() {
        _requests.push(CapturedRequest(0, address(0), bytes4(0), "", 0));
    }

    // ─────────── IAgentRequester ───────────

    function createRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload
    ) external payable returns (uint256 requestId) {
        _requests.push(CapturedRequest({
            agentId: agentId,
            callbackAddress: callbackAddress,
            callbackSelector: callbackSelector,
            payload: payload,
            perAgentBudget: msg.value
        }));
        requestCount = _requests.length - 1;
        requestId = requestCount;
        emit RequestCreated(requestId, agentId, msg.value, payload, new address[](0));
    }

    function createAdvancedRequest(
        uint256,
        address,
        bytes4,
        bytes calldata,
        uint256,
        uint256,
        ConsensusType,
        uint256
    ) external payable returns (uint256) {
        revert("MockAgentPlatform: createAdvancedRequest not implemented");
    }

    function getRequest(uint256) external pure returns (Request memory) {
        revert("MockAgentPlatform: getRequest not implemented");
    }

    function hasRequest(uint256 requestId) external view returns (bool) {
        return requestId > 0 && requestId < _requests.length;
    }

    function getRequestDeposit() external pure returns (uint256) {
        return 12e16;
    }

    function getAdvancedRequestDeposit(uint256) external pure returns (uint256) {
        return 12e16;
    }

    // ─────────── test helpers ───────────

    function capturedRequests(uint256 requestId) external view returns (CapturedRequest memory) {
        return _requests[requestId];
    }

    function lastRequest() external view returns (CapturedRequest memory) {
        return _requests[requestCount];
    }

    /// @notice Invokes the resolver's recorded callback with the supplied responses + status.
    function simulateCallback(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status
    ) external {
        CapturedRequest memory r = _requests[requestId];

        Request memory req;
        req.id = requestId;
        req.requester = address(this);
        req.callbackAddress = r.callbackAddress;
        req.callbackSelector = r.callbackSelector;
        req.status = status;

        (bool ok, bytes memory ret) = r.callbackAddress.call(
            abi.encodeWithSelector(r.callbackSelector, requestId, responses, status, req)
        );
        require(ok, _revertReason(ret));
    }

    function _revertReason(bytes memory ret) private pure returns (string memory) {
        if (ret.length < 68) return "MockAgentPlatform: callback reverted";
        assembly { ret := add(ret, 0x04) }
        return abi.decode(ret, (string));
    }
}
