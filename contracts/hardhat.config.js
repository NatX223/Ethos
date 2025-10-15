require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    base: {
      url: process.env.BASE_RPC_URL,,
      accounts: [process.env.SIGNER]
    }
  },
};
