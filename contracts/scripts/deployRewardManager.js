const { ethers } = require('hardhat');
// import { ethers } from "ethers";

async function main() {
    const [signer] = await ethers.getSigners();
    const ownerAddress = await signer.getAddress();

    console.log("Deploying with address:", ownerAddress);

    const RewardManager = await ethers.getContractFactory('RewardManager', signer);
    const rewardmanager = await RewardManager.deploy(ownerAddress, ownerAddress);
    const rewardmanagerAddress = await rewardmanager.getAddress();

    console.log(`reward manager deployed to: ${rewardmanagerAddress}`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});