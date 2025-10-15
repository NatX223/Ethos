require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "london",
    },
  },
  networks: {
    base: {
      url: process.env.BASE_RPC_URL,
      accounts: [process.env.SIGNER]
    }
  },
};
0x9fB1005DF6A157387E92727Abe8C550405c31779