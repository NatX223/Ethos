const { ethers } = require('hardhat');
// import { ethers } from "ethers";

async function main() {
    const [signer] = await ethers.getSigners();

    const GoalFactory = await ethers.getContractAt('GoalFactory', "0xd6D4aD7B23039bD00a2d3C3617a44B46aa31B42C", signer);
    
    const goalFactoryTX = await GoalFactory.deployGoal();

    console.log(`goal deployed to: ${goalFactoryTX}`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});