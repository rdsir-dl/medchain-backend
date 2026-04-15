import "@nomicfoundation/hardhat-toolbox";
/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 0
      }
    }
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "reports/gas-report.txt",
    noColors: true
  }
};
