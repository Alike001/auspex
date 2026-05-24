// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";

contract EscrowTest is Test {
    address internal client = makeAddr("client");
    address internal deliverer = makeAddr("deliverer");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant BRIEF_HASH = keccak256("write a landing page");
    string  internal constant BRIEF_URI = "https://example.com/brief.md";
    uint256 internal constant LOCKED_AMOUNT = 5 ether;
    uint256 internal deadline;

    function setUp() public {
        deadline = block.timestamp + 7 days;
        vm.deal(client, 100 ether);
        vm.deal(deliverer, 1 ether);
        vm.deal(stranger, 1 ether);
    }

    function _deployStubEscrow() internal returns (Escrow esc) {
        esc = new Escrow{value: LOCKED_AMOUNT}(
            client, deliverer, address(0), BRIEF_HASH, BRIEF_URI, deadline
        );
    }

    function _deployResolverEscrow(address resolver) internal returns (Escrow esc) {
        esc = new Escrow{value: LOCKED_AMOUNT}(
            client, deliverer, resolver, BRIEF_HASH, BRIEF_URI, deadline
        );
    }

    // ─────────── construction ───────────

    function test_ConstructorSetsImmutables() public {
        Escrow esc = _deployStubEscrow();
        assertEq(esc.client(), client);
        assertEq(esc.deliverer(), deliverer);
        assertEq(esc.resolver(), address(0));
        assertEq(esc.briefHash(), BRIEF_HASH);
        assertEq(esc.briefURI(), BRIEF_URI);
        assertEq(esc.deadline(), deadline);
        assertEq(uint256(esc.state()), uint256(Escrow.State.Open));
        assertEq(address(esc).balance, LOCKED_AMOUNT);
    }

    // ─────────── submitDelivery (stub path) ───────────

    function test_SubmitDelivery_StubResolvesToReleased() public {
        Escrow esc = _deployStubEscrow();

        vm.prank(deliverer);
        esc.submitDelivery("https://example.com/delivery");

        assertEq(uint256(esc.state()), uint256(Escrow.State.Resolved));
        assertEq(esc.deliveryUrl(), "https://example.com/delivery");
        assertEq(esc.verdict(), "released");
        assertEq(esc.reasoning(), "stubbed");
    }

    function test_SubmitDelivery_RevertsForNonDeliverer() public {
        Escrow esc = _deployStubEscrow();

        vm.prank(stranger);
        vm.expectRevert(Escrow.OnlyDeliverer.selector);
        esc.submitDelivery("https://example.com/delivery");
    }

    function test_SubmitDelivery_RevertsForEmptyUrl() public {
        Escrow esc = _deployStubEscrow();

        vm.prank(deliverer);
        vm.expectRevert(Escrow.InvalidDelivery.selector);
        esc.submitDelivery("");
    }

    function test_SubmitDelivery_RevertsIfNotOpen() public {
        Escrow esc = _deployStubEscrow();

        vm.prank(deliverer);
        esc.submitDelivery("https://example.com/delivery");

        // Now in Resolved — submitting again should revert
        vm.prank(deliverer);
        vm.expectRevert(
            abi.encodeWithSelector(Escrow.WrongState.selector, Escrow.State.Open, Escrow.State.Resolved)
        );
        esc.submitDelivery("https://example.com/delivery2");
    }

    // ─────────── claim (released path) ───────────

    function test_Claim_ReleasedPathPaysDeliverer() public {
        Escrow esc = _deployStubEscrow();

        vm.prank(deliverer);
        esc.submitDelivery("https://example.com/delivery");

        uint256 balanceBefore = deliverer.balance;

        vm.prank(deliverer);
        esc.claim();

        assertEq(deliverer.balance, balanceBefore + LOCKED_AMOUNT);
        assertEq(uint256(esc.state()), uint256(Escrow.State.Claimed));
        assertEq(address(esc).balance, 0);
    }

    function test_Claim_RevertsIfClaimerIsNotEntitled() public {
        Escrow esc = _deployStubEscrow();

        vm.prank(deliverer);
        esc.submitDelivery("https://example.com/delivery");

        // verdict is "released" — client is NOT entitled
        vm.prank(client);
        vm.expectRevert(Escrow.NotEntitled.selector);
        esc.claim();
    }

    // ─────────── applyVerdict (resolver path) + refunded claim ───────────

    function test_ApplyVerdict_OnlyResolverCanCall() public {
        Escrow esc = _deployResolverEscrow(address(this));

        vm.prank(deliverer);
        esc.submitDelivery("https://example.com/delivery");

        // Stranger cannot apply a verdict
        vm.prank(stranger);
        vm.expectRevert(Escrow.OnlyResolver.selector);
        esc.applyVerdict("refunded", "client wins");
    }

    function test_Claim_RefundedPathPaysClient() public {
        // This test contract acts as the resolver
        Escrow esc = _deployResolverEscrow(address(this));

        vm.prank(deliverer);
        esc.submitDelivery("https://example.com/delivery");

        // Still in Delivered — resolver pushes to Resolved with "refunded"
        assertEq(uint256(esc.state()), uint256(Escrow.State.Delivered));
        esc.applyVerdict("refunded", "delivery did not match brief");

        assertEq(esc.verdict(), "refunded");
        assertEq(esc.reasoning(), "delivery did not match brief");

        uint256 balanceBefore = client.balance;
        vm.prank(client);
        esc.claim();

        assertEq(client.balance, balanceBefore + LOCKED_AMOUNT);
        assertEq(uint256(esc.state()), uint256(Escrow.State.Claimed));
    }
}
