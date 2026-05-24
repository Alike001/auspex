// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EscrowFactory} from "../src/EscrowFactory.sol";
import {Escrow} from "../src/Escrow.sol";

contract EscrowFactoryTest is Test {
    EscrowFactory internal factory;

    address internal client = makeAddr("client");
    address internal otherClient = makeAddr("otherClient");
    address internal deliverer = makeAddr("deliverer");
    address internal resolver = makeAddr("resolver");

    bytes32 internal constant BRIEF_HASH = keccak256("write a landing page");
    string  internal constant BRIEF_URI = "https://example.com/brief.md";
    uint256 internal constant LOCKED_AMOUNT = 5 ether;
    uint256 internal deadline;

    event JobCreated(
        address indexed escrow,
        address indexed client,
        address indexed deliverer,
        uint256 amount,
        bytes32 briefHash
    );

    function setUp() public {
        factory = new EscrowFactory(resolver);
        deadline = block.timestamp + 7 days;
        vm.deal(client, 100 ether);
        vm.deal(otherClient, 100 ether);
    }

    function test_CreateJob_DeploysFundedEscrow() public {
        vm.prank(client);
        address escrowAddr = factory.createJob{value: LOCKED_AMOUNT}(
            BRIEF_HASH, BRIEF_URI, deliverer, deadline
        );

        Escrow esc = Escrow(escrowAddr);
        assertEq(esc.client(), client);
        assertEq(esc.deliverer(), deliverer);
        assertEq(esc.resolver(), resolver);
        assertEq(esc.briefHash(), BRIEF_HASH);
        assertEq(uint256(esc.state()), uint256(Escrow.State.Open));
        assertEq(escrowAddr.balance, LOCKED_AMOUNT);
    }

    function test_CreateJob_EmitsJobCreated() public {
        // We don't know the escrow address yet — match only client + deliverer (indexed) + data
        vm.expectEmit(false, true, true, true);
        emit JobCreated(address(0), client, deliverer, LOCKED_AMOUNT, BRIEF_HASH);

        vm.prank(client);
        factory.createJob{value: LOCKED_AMOUNT}(BRIEF_HASH, BRIEF_URI, deliverer, deadline);
    }

    function test_CreateJob_AppendsToAllJobs() public {
        vm.prank(client);
        address a = factory.createJob{value: LOCKED_AMOUNT}(BRIEF_HASH, BRIEF_URI, deliverer, deadline);

        vm.prank(otherClient);
        address b = factory.createJob{value: LOCKED_AMOUNT}(BRIEF_HASH, BRIEF_URI, deliverer, deadline);

        address[] memory all = factory.allJobs();
        assertEq(all.length, 2);
        assertEq(all[0], a);
        assertEq(all[1], b);
        assertEq(factory.allJobsLength(), 2);
    }

    function test_CreateJob_AppendsToJobsByClient() public {
        vm.prank(client);
        address a = factory.createJob{value: LOCKED_AMOUNT}(BRIEF_HASH, BRIEF_URI, deliverer, deadline);

        vm.prank(client);
        address b = factory.createJob{value: LOCKED_AMOUNT}(BRIEF_HASH, BRIEF_URI, deliverer, deadline);

        vm.prank(otherClient);
        factory.createJob{value: LOCKED_AMOUNT}(BRIEF_HASH, BRIEF_URI, deliverer, deadline);

        address[] memory clientJobs = factory.jobsByClient(client);
        assertEq(clientJobs.length, 2);
        assertEq(clientJobs[0], a);
        assertEq(clientJobs[1], b);

        assertEq(factory.jobsByClient(otherClient).length, 1);
    }

    function test_CreateJob_RevertsOnZeroValue() public {
        vm.prank(client);
        vm.expectRevert(EscrowFactory.ZeroValue.selector);
        factory.createJob{value: 0}(BRIEF_HASH, BRIEF_URI, deliverer, deadline);
    }

    function test_CreateJob_RevertsOnZeroDeliverer() public {
        vm.prank(client);
        vm.expectRevert(EscrowFactory.EmptyDelivererAddress.selector);
        factory.createJob{value: LOCKED_AMOUNT}(BRIEF_HASH, BRIEF_URI, address(0), deadline);
    }

    function test_CreateJob_RevertsOnEmptyBriefHash() public {
        vm.prank(client);
        vm.expectRevert(EscrowFactory.EmptyBriefHash.selector);
        factory.createJob{value: LOCKED_AMOUNT}(bytes32(0), BRIEF_URI, deliverer, deadline);
    }
}
