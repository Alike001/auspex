// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IAgentRequester,
    IJsonApiAgent,
    IParseWebsiteAgent,
    ILLMAgent,
    Request,
    Response,
    ResponseStatus
} from "./interfaces/ISomniaAgents.sol";
import {IAuspexResolver} from "./interfaces/IAuspexResolver.sol";
import {IEscrow} from "./interfaces/IEscrow.sol";
import {SomniaConstants} from "./SomniaConstants.sol";

/// @title  AuspexResolver
/// @notice 3-step agent composition: JSON API (reachability) → Parse Website (content) → LLM (verdict).
contract AuspexResolver is IAuspexResolver {
    enum Step {
        None,            // awaiting JSON API result
        FetchedMetadata, // awaiting Parse Website result
        ParsedDelivery   // awaiting LLM judge result
    }

    struct Resolution {
        address escrow;
        Step    step;
        string  briefURI;
        string  deliveryUrl;
        string  parsedContent;
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
    event VerdictApplied(address indexed escrow, uint256 indexed requestId, string verdict, string reasoning);

    constructor(IAgentRequester _platform) {
        platform = _platform;
    }

    modifier onlyPlatform() {
        if (msg.sender != address(platform)) revert OnlyPlatform();
        _;
    }

    // ─────────── entry point ───────────

    function startResolution(
        address escrow,
        string calldata briefURI,
        string calldata deliveryUrl
    ) external payable override returns (uint256 requestId) {
        if (msg.sender != escrow) revert OnlyEscrow();
        uint256 required = 3 * SomniaConstants.DEPOSIT_PER_CALL;
        if (msg.value < required) revert InsufficientDeposit(msg.value, required);

        // Step 1 is a "service-alive" probe against a known stable JSON endpoint
        // (CoinGecko ping, per sdk-snippets §3). Per-delivery reachability is
        // handled by Step 2 (Parse Website), which actually fetches deliveryUrl.
        bytes memory payload = abi.encodeWithSelector(
            IJsonApiAgent.fetchString.selector,
            "https://api.coingecko.com/api/v3/ping",
            "gecko_says"
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
            deliveryUrl: deliveryUrl,
            parsedContent: ""
        });

        emit ResolutionStarted(escrow, requestId, deliveryUrl);
    }

    // ─────────── step 1 callback: JSON API metadata ───────────

    function onMetadata(
        uint256 requestId,
        Response[] memory /* responses */,
        ResponseStatus status,
        Request memory /* request */
    ) external onlyPlatform {
        Resolution memory res = resolutions[requestId];
        if (res.escrow == address(0)) revert UnknownRequest(requestId);

        if (status != ResponseStatus.Success) {
            delete resolutions[requestId];
            IEscrow(res.escrow).applyVerdict("refunded", "URL unreachable");
            emit ResolutionFailed(res.escrow, requestId, "URL unreachable");
            return;
        }

        bytes memory payload = abi.encodeWithSelector(
            IParseWebsiteAgent.ExtractString.selector,
            "content",
            "Main visible content of the delivered page",
            new string[](0),
            "Extract the main visible content focused on headings and primary copy",
            res.deliveryUrl,
            false,
            uint8(1)
        );

        uint256 nextRequestId = platform.createRequest{value: SomniaConstants.DEPOSIT_PER_CALL}(
            SomniaConstants.PARSE_WEBSITE_AGENT_ID,
            address(this),
            this.onParsed.selector,
            payload
        );

        resolutions[nextRequestId] = Resolution({
            escrow: res.escrow,
            step: Step.FetchedMetadata,
            briefURI: res.briefURI,
            deliveryUrl: res.deliveryUrl,
            parsedContent: ""
        });

        delete resolutions[requestId];
        emit StepAdvanced(requestId, nextRequestId, Step.FetchedMetadata);
    }

    // ─────────── step 2 callback: parse website ───────────

    function onParsed(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* request */
    ) external onlyPlatform {
        Resolution memory res = resolutions[requestId];
        if (res.escrow == address(0)) revert UnknownRequest(requestId);

        if (status != ResponseStatus.Success) {
            delete resolutions[requestId];
            IEscrow(res.escrow).applyVerdict("refunded", "Could not parse delivered page");
            emit ResolutionFailed(res.escrow, requestId, "Could not parse delivered page");
            return;
        }

        string memory parsed = _decodeStringResponse(responses);

        if (bytes(parsed).length == 0) {
            delete resolutions[requestId];
            IEscrow(res.escrow).applyVerdict("refunded", "Delivered page returned no content");
            emit ResolutionFailed(res.escrow, requestId, "Delivered page returned no content");
            return;
        }

        string[] memory allowedValues = new string[](2);
        allowedValues[0] = "released";
        allowedValues[1] = "refunded";

        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferString.selector,
            _buildLLMPrompt(res.briefURI, parsed),
            "You are Auspex, an impartial arbiter. You judge whether delivered work satisfies a brief. Reply with one of the allowed values only.",
            false,
            allowedValues
        );

        uint256 nextRequestId = platform.createRequest{value: SomniaConstants.DEPOSIT_PER_CALL}(
            SomniaConstants.LLM_AGENT_ID,
            address(this),
            this.onJudgment.selector,
            payload
        );

        resolutions[nextRequestId] = Resolution({
            escrow: res.escrow,
            step: Step.ParsedDelivery,
            briefURI: res.briefURI,
            deliveryUrl: res.deliveryUrl,
            parsedContent: parsed
        });

        delete resolutions[requestId];
        emit StepAdvanced(requestId, nextRequestId, Step.ParsedDelivery);
    }

    // ─────────── step 3 callback: LLM verdict ───────────

    function onJudgment(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /* request */
    ) external onlyPlatform {
        Resolution memory res = resolutions[requestId];
        if (res.escrow == address(0)) revert UnknownRequest(requestId);

        if (status != ResponseStatus.Success) {
            delete resolutions[requestId];
            string memory timeoutReason = unicode"LLM judge timed out — defaulting to refund";
            IEscrow(res.escrow).applyVerdict("refunded", timeoutReason);
            emit VerdictApplied(res.escrow, requestId, "refunded", timeoutReason);
            return;
        }

        string memory rawVerdict = _decodeStringResponse(responses);
        string memory finalVerdict =
            keccak256(bytes(rawVerdict)) == keccak256(bytes("released")) ? "released" : "refunded";

        string memory reasoning = string.concat(
            "Verdict: ", finalVerdict, unicode" · Evidence: ", res.parsedContent
        );

        delete resolutions[requestId];
        IEscrow(res.escrow).applyVerdict(finalVerdict, reasoning);
        emit VerdictApplied(res.escrow, requestId, finalVerdict, reasoning);
    }

    // ─────────── helpers ───────────

    function _decodeStringResponse(Response[] memory responses) private pure returns (string memory) {
        if (responses.length == 0) return "";
        bytes memory raw = responses[0].result;
        if (raw.length == 0) return "";
        return abi.decode(raw, (string));
    }

    function _buildLLMPrompt(string memory briefURI, string memory parsed)
        private
        pure
        returns (string memory)
    {
        return string.concat(
            "Brief URI: ", briefURI, "\n",
            "Delivered content extracted from URL: ", parsed, "\n",
            "Does the delivered content satisfy the brief? Reply 'released' (yes) or 'refunded' (no)."
        );
    }
}
