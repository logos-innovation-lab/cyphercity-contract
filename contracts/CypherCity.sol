//SPDX-License-Identifier: MIT
pragma abicoder v2;
pragma solidity ^0.8.4;

import "./CypherCitySemaphore.sol";

contract CypherCity {
    error IdentityAlreadyExists();

    event NewIdentity(uint256 identityCommitment);

    uint256 public constant ADD_TO_GROUP = uint256(keccak256(abi.encodePacked("add_to_group")));

    CypherCitySemaphore public semaphore;

    uint256 public groupId;
    mapping(uint256 => bool) public registeredIdentities;

    constructor(address semaphoreAddress, uint256 _groupId) {
        semaphore = CypherCitySemaphore(semaphoreAddress);
        groupId = _groupId;

        semaphore.createGroup(groupId, 20, address(this));
    }

    function joinGroup(uint256 identityCommitment) external {
        if (registeredIdentities[identityCommitment] == true) {
            revert IdentityAlreadyExists();
        }

        semaphore.addMember(groupId, identityCommitment);
        registeredIdentities[identityCommitment] = true;

        emit NewIdentity(identityCommitment);
    }

    function addToGroup(
        uint256 identityCommitment,
        uint256 merkleTreeRoot,
        uint256 nullifierHash,
        uint256 externalNullifier,
        uint256[8] calldata proof
    ) external {
        semaphore.verifyProof(
            groupId,
            merkleTreeRoot,
            ADD_TO_GROUP,
            nullifierHash,
            externalNullifier,
            proof
        );

        this.joinGroup(identityCommitment);
    }

    function getMerkleRootCreationDate(uint256 merkleRoot) external view returns (uint256) {
        return semaphore.getMerkleRootCreationDate(groupId, merkleRoot);
    }

    function getMerkleTreeRoot() external view returns (uint256) {
        return semaphore.getMerkleTreeRoot(groupId);
    }
}