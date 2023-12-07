import { task, types } from "hardhat/config"

task("deploy", "Deploy a CypherCity contract")
    .addOptionalParam("semaphore", "Semaphore contract address", undefined, types.string)
    .addOptionalParam("group", "Group id", 42, types.int)
    .addOptionalParam("logs", "Print the logs", true, types.boolean)
    .setAction(async ({ logs, semaphore: semaphoreAddress, group: groupId }, { ethers, run }) => {
        if (!semaphoreAddress) {
            const { semaphore } = await run("deploy:semaphore", {
                logs
            })

            semaphoreAddress = semaphore.address
        }

        const cypherCityFactory = await ethers.getContractFactory("CypherCity")

        const cypherCityContract = await cypherCityFactory.deploy(semaphoreAddress, groupId, {gasLimit: 21000000})

        await cypherCityContract.deployed()

        const cypherCityContractAddress = await cypherCityContract.address

        if (logs) {
            console.info(`CypherCity contract has been deployed to: ${cypherCityContractAddress}`)
        }

        return cypherCityContract
    })