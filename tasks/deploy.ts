import { task, types } from "hardhat/config"

task("deploy", "Deploy a CypherCity contract")
    .addOptionalParam("semaphore", "Semaphore contract address", undefined, types.string)
    .addOptionalParam("group", "Group id", 42, types.int)
    .addOptionalParam("logs", "Print the logs", true, types.boolean)
    .setAction(async ({ logs, group: groupId }, { ethers, run }) => {
        const { semaphore, semaphoreVerifierAddress, incrementalBinaryTreeAddress } = await run("deploy:semaphore", {
            logs
        })

        const semaphoreAddress = await semaphore.address

        const CypherCitySemaphoreFactory = await ethers.getContractFactory("CypherCitySemaphore", {
            libraries: {
                IncrementalBinaryTree: incrementalBinaryTreeAddress
            },
        })
        const cypherCitySemaphore = await CypherCitySemaphoreFactory.deploy(semaphoreVerifierAddress)

        await cypherCitySemaphore.deployed()

        const cypherCitySemaphoreAddress = await cypherCitySemaphore.address

        const cypherCityFactory = await ethers.getContractFactory("CypherCity")

        const cypherCityContract = await cypherCityFactory.deploy(cypherCitySemaphoreAddress, groupId, {gasLimit: 21000000})

        await cypherCityContract.deployed()

        const cypherCityAddress = await cypherCityContract.address

        if (logs) {
            console.info(`CypherCity contract has been deployed to: ${cypherCityAddress}`)
        }

        return {
            cypherCityContract,
            cypherCityAddress,
            cypherCitySemaphoreAddress,
            semaphoreAddress,
        }
    })