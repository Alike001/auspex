// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SomniaConstants} from "../src/SomniaConstants.sol";

contract SomniaConstantsTest is Test {
    function test_PlatformAddressMatchesSpec() public pure {
        assertEq(
            SomniaConstants.PLATFORM_TESTNET,
            0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776
        );
    }

    function test_AgentIdsMatchSpec() public pure {
        assertEq(SomniaConstants.JSON_API_AGENT_ID, 13174292974160097713);
        assertEq(SomniaConstants.LLM_AGENT_ID, 12847293847561029384);
        assertEq(SomniaConstants.PARSE_WEBSITE_AGENT_ID, 12875401142070969085);
    }

    function test_DepositPerCallMatchesSpec() public pure {
        assertEq(SomniaConstants.DEPOSIT_PER_CALL, 12e16);
    }
}
