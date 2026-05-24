// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Escrow} from "./Escrow.sol";

/// @title  EscrowFactory
/// @notice One factory per deployment. Each `createJob` call deploys a fresh Escrow funded with
///         msg.value. The factory keeps an index of every Escrow it has spawned so frontends can
///         enumerate jobs without scanning the chain.
contract EscrowFactory {
    error EmptyDelivererAddress();
    error EmptyBriefHash();
    error ZeroValue();

    event JobCreated(
        address indexed escrow,
        address indexed client,
        address indexed deliverer,
        uint256 amount,
        bytes32 briefHash
    );

    address public immutable resolver;

    address[] private _allJobs;
    mapping(address => address[]) private _jobsByClient;

    constructor(address _resolver) {
        resolver = _resolver;
    }

    /// @notice Deploy a new Escrow funded with msg.value, locking the funds until resolution.
    /// @param  _briefHash  keccak256 of the brief content (commitment)
    /// @param  _briefURI   off-chain pointer to the brief (IPFS/Arweave/HTTPS)
    /// @param  _deliverer  the address that may submit the delivery
    /// @param  _deadline   unix timestamp after which the brief is considered overdue
    function createJob(
        bytes32 _briefHash,
        string calldata _briefURI,
        address _deliverer,
        uint256 _deadline
    ) external payable returns (address escrow) {
        if (msg.value == 0) revert ZeroValue();
        if (_deliverer == address(0)) revert EmptyDelivererAddress();
        if (_briefHash == bytes32(0)) revert EmptyBriefHash();

        Escrow newEscrow = new Escrow{value: msg.value}(
            msg.sender,
            _deliverer,
            resolver,
            _briefHash,
            _briefURI,
            _deadline
        );
        escrow = address(newEscrow);

        _allJobs.push(escrow);
        _jobsByClient[msg.sender].push(escrow);

        emit JobCreated(escrow, msg.sender, _deliverer, msg.value, _briefHash);
    }

    function allJobs() external view returns (address[] memory) {
        return _allJobs;
    }

    function jobsByClient(address client) external view returns (address[] memory) {
        return _jobsByClient[client];
    }

    function allJobsLength() external view returns (uint256) {
        return _allJobs.length;
    }
}
