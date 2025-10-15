const { ethers } = require('hardhat');
// import { ethers } from "ethers";

async function main() {
    const [signer] = await ethers.getSigners();
    const ownerAddress = await signer.getAddress();
    const stakeToken = "0x4C2AA252BEe766D3399850569713b55178934849";
    const settlers = [ownerAddress]

    console.log("Deploying with address:", ownerAddress);

    const challengeFactory = await ethers.getContractFactory('ChallengeFactory', signer);
    const challengefactory = await challengeFactory.deploy(ownerAddress, settlers, stakeToken);
    const challengefactoryAddress = await challengefactory.getAddress();

    console.log(`RewardchallengeFactory deployed to: ${challengefactoryAddress}`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});