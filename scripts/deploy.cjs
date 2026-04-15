const hre = require("hardhat");

async function main() {
  const contractFactory = await hre.ethers.getContractFactory("DrugAudit");
  const contract = await contractFactory.deploy();
  await contract.waitForDeployment();
  console.log("DrugAudit deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
