// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@semaphore-protocol/contracts/Semaphore.sol";
import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

contract CypherCitySemaphore is Semaphore {
    constructor(ISemaphoreVerifier _verifier) Semaphore(_verifier) {}

    function getMerkleRootCreationDate(uint256 groupId, uint256 merkleRoot) external view returns (uint256) {
        return groups[groupId].merkleRootCreationDates[merkleRoot];
    }
}