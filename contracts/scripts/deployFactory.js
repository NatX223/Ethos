const { ethers } = require('hardhat');
// import { ethers } from "ethers";

async function main() {
    const [signer] = await ethers.getSigners();
    const ownerAddress = await signer.getAddress();
    const settlers = [ownerAddress]

    console.log("Deploying with address:", ownerAddress);

    const GoalFactory = await ethers.getContractFactory('GoalFactory', signer);
    const goalfactory = await GoalFactory.deploy(settlers, "0xc54FfB00e1C630f0D7a72ECBCDA043883a0f690e");
    const goalfactoryAddress = await goalfactory.getAddress();

    console.log(`goal factory deployed to: ${goalfactoryAddress}`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});