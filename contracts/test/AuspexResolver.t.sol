// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AuspexResolver} from "../src/AuspexResolver.sol";
import {Escrow} from "../src/Escrow.sol";
import {
    IJsonApiAgent,
    IParseWebsiteAgent,
    ILLMAgent,
    Request,
    Response,
    ResponseStatus
} from "../src/interfaces/ISomniaAgents.sol";
import {SomniaConstants} from "../src/SomniaConstants.sol";
import {MockAgentPlatform} from "./mocks/MockAgentPlatform.sol";

contract AuspexResolverTest is Test {
    MockAgentPlatform internal platform;
    AuspexResolver   internal resolver;

    address internal client = makeAddr("client");
    address internal deliverer = makeAddr("deliverer");

    bytes32 internal constant BRIEF_HASH = keccak256("write a landing page");
    string  internal constant BRIEF_URI = "https://example.com/brief.md";
    string  internal constant DELIVERY_URL = "https://example.com/delivery";
    uint256 internal constant LOCKED_AMOUNT = 5 ether;
    uint256 internal constant DEPOSIT = 36e16;

    function setUp() public {
        platform = new MockAgentPlatform();
        resolver = new AuspexResolver(platform);
        vm.deal(client, 100 ether);
    }

    // ─────────── helpers ───────────

    function _deployEscrow() internal returns (Escrow esc) {
        vm.prank(client);
        esc = new Escrow{value: LOCKED_AMOUNT}(
            client, deliverer, address(resolver), BRIEF_HASH, BRIEF_URI, block.timestamp + 7 days
        );
    }

    function _deliverAndResolve(Escrow esc) internal returns (uint256 requestId) {
        vm.prank(deliverer);
        esc.submitDelivery(DELIVERY_URL);
        requestId = esc.resolve();
    }

    /// @dev Drive an escrow through onMetadata(Success) to land at Step.FetchedMetadata.
    function _advanceToParseStep(Escrow esc) internal returns (uint256 parseReqId) {
        uint256 jsonReqId = _deliverAndResolve(esc);
        Response[] memory empty = new Response[](0);
        platform.simulateCallback(jsonReqId, empty, ResponseStatus.Success);
        parseReqId = jsonReqId + 1; // MockAgentPlatform issues sequential ids
    }

    function _stringResponse(string memory s) internal pure returns (Response[] memory rs) {
        rs = new Response[](1);
        rs[0].result = abi.encode(s);
        rs[0].status = ResponseStatus.Success;
    }

    function _emptyRequest(uint256 id) internal pure returns (Request memory req) {
        req.id = id;
    }

    // ─────────── startResolution ───────────

    function test_StartResolution_FiresJsonApiCreateRequest() public {
        Escrow esc = _deployEscrow();
        uint256 requestId = _deliverAndResolve(esc);

        MockAgentPlatform.CapturedRequest memory r = platform.capturedRequests(requestId);
        assertEq(r.agentId, SomniaConstants.JSON_API_AGENT_ID);
        assertEq(r.callbackAddress, address(resolver));
        assertEq(r.callbackSelector, resolver.onMetadata.selector);
        assertEq(r.perAgentBudget, SomniaConstants.DEPOSIT_PER_CALL);

        bytes memory expected = abi.encodeWithSelector(
            IJsonApiAgent.fetchString.selector, DELIVERY_URL, "$.status"
        );
        assertEq(r.payload, expected);
    }

    function test_StartResolution_RecordsResolutionAtStepNone() public {
        Escrow esc = _deployEscrow();
        uint256 requestId = _deliverAndResolve(esc);

        (
            address resEscrow,
            AuspexResolver.Step step,
            string memory uri,
            string memory url,
            string memory parsed
        ) = resolver.resolutions(requestId);

        assertEq(resEscrow, address(esc));
        assertEq(uint256(step), uint256(AuspexResolver.Step.None));
        assertEq(uri, BRIEF_URI);
        assertEq(url, DELIVERY_URL);
        assertEq(parsed, "");
    }

    function test_StartResolution_RevertsForNonEscrowCaller() public {
        address randomEscrow = makeAddr("randomEscrow");
        vm.deal(address(this), 1 ether);
        vm.expectRevert(AuspexResolver.OnlyEscrow.selector);
        resolver.startResolution{value: DEPOSIT}(randomEscrow, BRIEF_URI, DELIVERY_URL);
    }

    // ─────────── onMetadata: Success ───────────

    function test_OnMetadata_SuccessFiresParseWebsiteCall() public {
        Escrow esc = _deployEscrow();
        uint256 firstReqId = _deliverAndResolve(esc);

        Response[] memory empty = new Response[](0);
        platform.simulateCallback(firstReqId, empty, ResponseStatus.Success);

        // Old entry deleted.
        (address resEscrowOld,,,,) = resolver.resolutions(firstReqId);
        assertEq(resEscrowOld, address(0));

        uint256 secondReqId = firstReqId + 1;
        (address resEscrowNew, AuspexResolver.Step step,,,) = resolver.resolutions(secondReqId);
        assertEq(resEscrowNew, address(esc));
        assertEq(uint256(step), uint256(AuspexResolver.Step.FetchedMetadata));

        MockAgentPlatform.CapturedRequest memory r = platform.capturedRequests(secondReqId);
        assertEq(r.agentId, SomniaConstants.PARSE_WEBSITE_AGENT_ID);
        assertEq(r.callbackSelector, resolver.onParsed.selector);
        assertEq(r.perAgentBudget, SomniaConstants.DEPOSIT_PER_CALL);
    }

    // ─────────── onMetadata: Failed ───────────

    function test_OnMetadata_FailedTriggersRefundVerdict() public {
        Escrow esc = _deployEscrow();
        uint256 firstReqId = _deliverAndResolve(esc);

        Response[] memory empty = new Response[](0);
        platform.simulateCallback(firstReqId, empty, ResponseStatus.Failed);

        assertEq(uint256(esc.state()), uint256(Escrow.State.Resolved));
        assertEq(esc.verdict(), "refunded");
        assertEq(esc.reasoning(), "URL unreachable");

        (address resEscrow,,,,) = resolver.resolutions(firstReqId);
        assertEq(resEscrow, address(0));
    }

    // ─────────── onMetadata: access control ───────────

    function test_OnMetadata_RevertsForNonPlatformCaller() public {
        Escrow esc = _deployEscrow();
        uint256 firstReqId = _deliverAndResolve(esc);

        Response[] memory empty = new Response[](0);
        vm.expectRevert(AuspexResolver.OnlyPlatform.selector);
        resolver.onMetadata(firstReqId, empty, ResponseStatus.Success, _emptyRequest(firstReqId));
    }

    // ─────────── onParsed: Success ───────────

    function test_OnParsed_SuccessFiresLLMCall() public {
        Escrow esc = _deployEscrow();
        uint256 parseReqId = _advanceToParseStep(esc);

        string memory content = "Page heading: Onchain Pixels. Tagline: pixel art for protocols.";
        platform.simulateCallback(parseReqId, _stringResponse(content), ResponseStatus.Success);

        // Old parse entry deleted.
        (address oldEscrow,,,,) = resolver.resolutions(parseReqId);
        assertEq(oldEscrow, address(0));

        // New LLM entry exists with parsedContent stored.
        uint256 llmReqId = parseReqId + 1;
        (
            address newEscrow,
            AuspexResolver.Step step,
            ,
            ,
            string memory storedParsed
        ) = resolver.resolutions(llmReqId);
        assertEq(newEscrow, address(esc));
        assertEq(uint256(step), uint256(AuspexResolver.Step.ParsedDelivery));
        assertEq(storedParsed, content);

        // LLM createRequest fired with correct agent + callback.
        MockAgentPlatform.CapturedRequest memory r = platform.capturedRequests(llmReqId);
        assertEq(r.agentId, SomniaConstants.LLM_AGENT_ID);
        assertEq(r.callbackSelector, resolver.onJudged.selector);
        assertEq(r.perAgentBudget, SomniaConstants.DEPOSIT_PER_CALL);
    }

    // ─────────── onParsed: Failed ───────────

    function test_OnParsed_FailedTriggersRefund() public {
        Escrow esc = _deployEscrow();
        uint256 parseReqId = _advanceToParseStep(esc);

        platform.simulateCallback(parseReqId, _stringResponse(""), ResponseStatus.Failed);

        assertEq(uint256(esc.state()), uint256(Escrow.State.Resolved));
        assertEq(esc.verdict(), "refunded");
        assertEq(esc.reasoning(), "Could not parse delivered page");

        (address resEscrow,,,,) = resolver.resolutions(parseReqId);
        assertEq(resEscrow, address(0));
    }

    // ─────────── onParsed: empty content short-circuits to refund ───────────

    function test_OnParsed_EmptyContentTriggersRefund() public {
        Escrow esc = _deployEscrow();
        uint256 parseReqId = _advanceToParseStep(esc);

        platform.simulateCallback(parseReqId, _stringResponse(""), ResponseStatus.Success);

        assertEq(uint256(esc.state()), uint256(Escrow.State.Resolved));
        assertEq(esc.verdict(), "refunded");
        assertEq(esc.reasoning(), "Delivered page returned no content");

        (address resEscrow,,,,) = resolver.resolutions(parseReqId);
        assertEq(resEscrow, address(0));
    }

    // ─────────── onParsed: access control ───────────

    function test_OnParsed_RevertsForNonPlatformCaller() public {
        Escrow esc = _deployEscrow();
        uint256 parseReqId = _advanceToParseStep(esc);

        vm.expectRevert(AuspexResolver.OnlyPlatform.selector);
        resolver.onParsed(
            parseReqId,
            _stringResponse("hi"),
            ResponseStatus.Success,
            _emptyRequest(parseReqId)
        );
    }
}
