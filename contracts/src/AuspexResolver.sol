// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IAgentRequester,
    IJsonApiAgent,
    IParseWebsiteAgent,
    Request,
    Response,
    ResponseStatus
} from "./interfaces/ISomniaAgents.sol";
import {IAuspexResolver} from "./interfaces/IAuspexResolver.sol";
import {IEscrow} from "./interfaces/IEscrow.sol";
import {SomniaConstants} from "./SomniaConstants.sol";

/// @title  AuspexResolver
/// @notice Step 1 of the 3-step agent composition: ask the JSON API agent to confirm the
///         delivered URL is reachable. On Success, hand off to the Parse Website agent
///         (next story). On Failed, refund the client.
contract AuspexResolver is IAuspexResolver {
    enum Step {
        None,             // awaiting JSON API result
        FetchedMetadata,  // awaiting Parse Website result
        ParsedSite        // awaiting LLM judge result
    }

    struct Resolution {
        address escrow;
        Step    step;
        string  briefURI;
        string  deliveryUrl;
    }

    IAgentRequester public immutable platform;
    mapping(uint256 => Resolution) public resolutions;

    error InsufficientDeposit(uint256 sent, uint256 required);
    error OnlyEscrow();
    error OnlyPlatform();
    error UnknownRequest(uint256 requestId);

    event ResolutionStarted(address indexed escrow, uint256 indexed requestId, string deliveryUrl);
    event StepAdvanced(uint256 indexed oldRequestId, uint256 indexed newRequestId, Step newStep);
    event ResolutionFailed(address indexed escrow, uint256 indexed requestId, string reason);

    constructor(IAgentRequester _platform) {
        platform = _platform;
    }

    modifier onlyPlatform() {
        if (msg.sender != address(platform)) revert OnlyPlatform();
        _;
    }

    // ─────────── entry point (called by Escrow.resolve) ───────────

    function startResolution(
        address escrow,
        string calldata briefURI,
        string calldata deliveryUrl
    ) external payable override returns (uint256 requestId) {
        if (msg.sender != escrow) revert OnlyEscrow();
        uint256 required = 3 * SomniaConstants.DEPOSIT_PER_CALL;
        if (msg.value < required) revert InsufficientDeposit(msg.value, required);

        bytes memory payload = abi.encodeWithSelector(
            IJsonApiAgent.fetchString.selector,
            deliveryUrl,
            "$.status"
        );

        requestId = platform.createRequest{value: SomniaConstants.DEPOSIT_PER_CALL}(
            SomniaConstants.JSON_API_AGENT_ID,
            address(this),
            this.onMetadata.selector,
            payload
        );

        resolutions[requestId] = Resolution({
            escrow: escrow,
            step: Step.None,
            briefURI: briefURI,
            deliveryUrl: deliveryUrl
        });

        emit ResolutionStarted(escrow, requestId, deliveryUrl);
    }

    // ─────────── callbacks (called by platform) ───────────

    function onMetadata(
        uint256 requestId,
        Response[] memory /* responses */,
        ResponseStatus status,
        Request memory /* request */
    ) external onlyPlatform {
        Resolution memory res = resolutions[requestId];
        if (res.escrow == address(0)) revert UnknownRequest(requestId);

        if (status == ResponseStatus.Success) {
            bytes memory payload = abi.encodeWithSelector(
                IParseWebsiteAgent.ExtractString.selector,
                "summary",
                "One-paragraph summary of the page",
                new string[](0),
                "Summarise the page in one paragraph",
                res.deliveryUrl,
                false,
                uint8(1)
            );

            uint256 nextRequestId = platform.createRequest{value: SomniaConstants.DEPOSIT_PER_CALL}(
                SomniaConstants.PARSE_WEBSITE_AGENT_ID,
                address(this),
                this.onParse.selector,
                payload
            );

            resolutions[nextRequestId] = Resolution({
                escrow: res.escrow,
                step: Step.FetchedMetadata,
                briefURI: res.briefURI,
                deliveryUrl: res.deliveryUrl
            });

            delete resolutions[requestId];
            emit StepAdvanced(requestId, nextRequestId, Step.FetchedMetadata);
        } else {
            delete resolutions[requestId];
            IEscrow(res.escrow).applyVerdict("refunded", "URL unreachable");
            emit ResolutionFailed(res.escrow, requestId, "URL unreachable");
        }
    }

    /// @dev Implemented in story-resolver-parse-website-step. For now, just validates the requestId
    ///      and advances the step so the warning about view mutability is silenced.
    function onParse(
        uint256 requestId,
        Response[] memory /* responses */,
        ResponseStatus /* status */,
        Request memory /* request */
    ) external onlyPlatform {
        Resolution memory res = resolutions[requestId];
        if (res.escrow == address(0)) revert UnknownRequest(requestId);
        resolutions[requestId].step = Step.ParsedSite;
    }
}
