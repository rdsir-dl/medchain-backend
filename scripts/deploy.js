import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const { ethers } = hre;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // 1. Deploy PrescChainAccess
  const AccessFactory = await ethers.getContractFactory("PrescChainAccess");
  const access = await AccessFactory.deploy();
  await access.waitForDeployment();
  const accessAddr = await access.getAddress();
  console.log("✅ PrescChainAccess deployed to:", accessAddr);

  // 2. Deploy PrescriptionRegistry (linked to Access)
  const RegistryFactory = await ethers.getContractFactory("PrescriptionRegistry");
  const registry = await RegistryFactory.deploy(accessAddr);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("✅ PrescriptionRegistry deployed to:", registryAddr);

  // 3. Deploy DrugUnitToken (linked to Access + Registry)
  const TokenFactory = await ethers.getContractFactory("DrugUnitToken");
  const token = await TokenFactory.deploy(accessAddr, registryAddr);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("✅ DrugUnitToken deployed to:", tokenAddr);

  // 4. Link Registry and Token (Crucial for Sales Authorization)
  console.log("⏳ Linking Registry to Token contract...");
  await (await registry.setTokenContract(tokenAddr)).wait();
  console.log("✅ Registry linked to Token contract");

  // 5. Grant roles to deployer for auto-testing
  // Deployer already has DEFAULT_ADMIN_ROLE + REGULATOR_ROLE from PrescChainAccess constructor

  // Grant MANUFACTURER_ROLE
  let tx = await access.addManufacturer(deployer.address, "Test Manufacturer");
  await tx.wait();
  console.log("✅ Granted MANUFACTURER_ROLE to", deployer.address);

  // Grant HOSPITAL_ROLE
  tx = await access.addHospital(deployer.address, "Test Hospital");
  await tx.wait();
  console.log("✅ Granted HOSPITAL_ROLE to", deployer.address);

  // Grant DEALER_ROLE
  tx = await access.addDealer(deployer.address, "Test Dealer");
  await tx.wait();
  console.log("✅ Granted DEALER_ROLE to", deployer.address);

  // Grant MEDICAL_STORE_ROLE
  tx = await access.addMedicalStore(deployer.address, "Test Medical Store");
  await tx.wait();
  console.log("✅ Granted MEDICAL_STORE_ROLE to", deployer.address);

  // 6. Set initial manufacturer limits for all 20 drugs (10,000 units each)
  console.log("⏳ Setting initial manufacturer limits...");
  for (let drugId = 1; drugId <= 20; drugId++) {
    tx = await token.setManufacturerLimit(deployer.address, drugId, 10000);
    await tx.wait();
  }
  console.log("✅ Manufacturer limits set (10,000 units per drug for all 20 drugs)");

  // Save deployment info
  const deployment = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      PrescChainAccess: accessAddr,
      PrescriptionRegistry: registryAddr,
      DrugUnitToken: tokenAddr
    },
    timestamp: new Date().toISOString()
  };

  const deploymentPath = path.resolve(__dirname, "../deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("✅ Saved deployment info to deployment.json");

  // Auto-update backend/.env if it exists
  const envPath = path.resolve(__dirname, "../backend/.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    envContent = envContent.replace(/ACCESS_CONTRACT_ADDRESS=.*/g, `ACCESS_CONTRACT_ADDRESS=${accessAddr}`);
    envContent = envContent.replace(/REGISTRY_CONTRACT_ADDRESS=.*/g, `REGISTRY_CONTRACT_ADDRESS=${registryAddr}`);
    envContent = envContent.replace(/TOKEN_CONTRACT_ADDRESS=.*/g, `TOKEN_CONTRACT_ADDRESS=${tokenAddr}`);
    fs.writeFileSync(envPath, envContent);
    console.log("✅ Auto-updated backend/.env");
  }

  console.log("\n🎉 Modular deployment complete!");
  console.log("  Access:", accessAddr);
  console.log("  Registry:", registryAddr);
  console.log("  Token:", tokenAddr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
