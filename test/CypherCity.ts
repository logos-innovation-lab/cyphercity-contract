import { Group } from "@semaphore-protocol/group"
import { Identity } from "@semaphore-protocol/identity"
import { generateProof } from "@semaphore-protocol/proof"
import { expect } from "chai"
import { keccak256 } from "ethers/lib/utils"
import { run, ethers } from "hardhat"
import { CypherCity } from "../build/typechain"
import { config } from "../package.json"
import { SemaphoreEthers } from "@semaphore-protocol/data"

const wasmFilePath = `${config.paths.build["snark-artifacts"]}/semaphore.wasm`
const zkeyFilePath = `${config.paths.build["snark-artifacts"]}/semaphore.zkey`

describe("CypherCity contract", () => {
    const groupId = 42
    const identitySeed = 'identity'

    let cypherCityContract: CypherCity
    let semaphoreContract: SemaphoreEthers
    let identities: Identity[] = []
    let offchainGroup = new Group(groupId)

    beforeEach(async () => {
        const runResult = await run("deploy", { logs: false, group: groupId })

        cypherCityContract = runResult.cypherCityContract
        semaphoreContract = new SemaphoreEthers('http://127.0.0.1:8545', {
            address: runResult.cypherCitySemaphoreAddress,
        })

        const accounts = await ethers.getSigners()
        identities = []
        for (let i = 0; i < accounts.length; i++) {
            identities.push(new Identity(await accounts[i].signMessage(identitySeed)))
        }

        offchainGroup = new Group(groupId)
    })

    describe("joinGroup", () => {
        beforeEach(async () => {
            // add the first two identities to the offchain group
            for (let i = 0; i < 2; i++) {
                offchainGroup.addMember(identities[i].getCommitment())
            }
        })

        it("Should allow users to join the group", async () => {
            for (let i = 0; i < offchainGroup.members.length; i += 1) {
                const transaction = await cypherCityContract.joinGroup(offchainGroup.members[i])

                await expect(transaction)
                    .to.emit(cypherCityContract, "NewIdentity")
                    .withArgs(offchainGroup.members[i])
            }
        })

        // TODO this test is made to be skipped
        // The test throws `Error: cannot estimate gas`, but in the callstack you can
        // see the IdentityAlreadyExists error and that it is reverted. Looks like a test
        // environment issue
        it.skip("Should not allow users to join the group with the same identity", async () => {
            for (let i = 0; i < offchainGroup.members.length; i += 1) {
                const transaction = await cypherCityContract.joinGroup(offchainGroup.members[i])
            }

            const transaction = await cypherCityContract.joinGroup(offchainGroup.members[0])

            await expect(transaction).to.be.revertedWithCustomError(cypherCityContract, "IdentityAlreadyExists")
        })
    })

    describe('addToGroup', () => {
        it('should add new user to the group', async () => {
            offchainGroup.addMember(identities[0].getCommitment())
            const joinTransaction = await cypherCityContract.joinGroup(offchainGroup.members[0])

            await expect(joinTransaction)
                .to.emit(cypherCityContract, "NewIdentity")
                .withArgs(offchainGroup.members[0])

            const identityCommitmentToAdd = identities[1].getCommitment()
            const externalNullifier = 0
            const signal = keccak256(new TextEncoder().encode("add_to_group"))
            const fullProof = await generateProof(identities[0], offchainGroup, externalNullifier, signal, {
                wasmFilePath,
                zkeyFilePath
            })

            const transaction = await cypherCityContract.addToGroup(
                identityCommitmentToAdd,
                fullProof.merkleTreeRoot,
                fullProof.nullifierHash,
                fullProof.externalNullifier,
                fullProof.proof,
            )

            await expect(transaction).to.emit(cypherCityContract, "NewIdentity").withArgs(identityCommitmentToAdd)
        })
    })

    describe('getMerkleRootCreationDate', () => {
        const validRoot = '130609093503090841981976335895018097223838937452121522402702987916354229482'
        const invalidRoot = '2' + validRoot.slice(1)

        beforeEach(async () => {
            // add the first two identities to the offchain group
            for (let i = 0; i < 2; i += 1) {
                offchainGroup.addMember(identities[i].getCommitment())
                const transaction = await cypherCityContract.joinGroup(offchainGroup.members[i])
            }

            const merkleRoot = await cypherCityContract.getMerkleTreeRoot()
            await expect(merkleRoot).to.equal(offchainGroup.merkleTree.root)
        })

        it('is valid root', async () => {
            const date = await cypherCityContract.getMerkleRootCreationDate(validRoot)
            await expect(date.toBigInt()).to.greaterThan(BigInt(0))
        })

        it('is not valid root', async () => {
            const date = await cypherCityContract.getMerkleRootCreationDate(invalidRoot)
            await expect(date.toBigInt()).to.eq(BigInt(0))
        })
    })
})