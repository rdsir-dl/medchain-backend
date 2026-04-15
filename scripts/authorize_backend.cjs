const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🛠️ Authorizing system wallet:", deployer.address);

  // Load addresses from deployment.json
  const fs = require("fs");
  const path = require("path");
  const deployment = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../deployment.json"), "utf8"));
  
  const accessAddr = deployment.contracts.PrescChainAccess;
  const access = await hre.ethers.getContractAt("PrescChainAccess", accessAddr);

  console.log("📡 Connecting to Access Control at:", accessAddr);

  // Verify Roles
  const HOSPITAL_ROLE = await access.HOSPITAL_ROLE();
  const DEALER_ROLE = await access.DEALER_ROLE();
  const MEDICAL_STORE_ROLE = await access.MEDICAL_STORE_ROLE();

  console.log("⏳ Granting roles to ensure backend works as all entities...");

  try {
    let tx = await access.addHospital(deployer.address, "System Hospital");
    await tx.wait();
    console.log("✅ Granted HOSPITAL_ROLE");
  } catch (e) {
    console.log("ℹ️ HOSPITAL_ROLE already granted or error:", e.message);
  }

  try {
    tx = await access.addDealer(deployer.address, "System Dealer");
    await tx.wait();
    console.log("✅ Granted DEALER_ROLE");
  } catch (e) {
    console.log("ℹ️ DEALER_ROLE already granted or error:", e.message);
  }

  try {
    tx = await access.addMedicalStore(deployer.address, "System Medical Store");
    await tx.wait();
    console.log("✅ Granted MEDICAL_STORE_ROLE");
  } catch (e) {
    console.log("ℹ️ MEDICAL_STORE_ROLE already granted or error:", e.message);
  }

  // 3. Grant Inventory to Backend Store
  const tokenAddr = deployment.contracts.DrugUnitToken;
  const token = await hre.ethers.getContractAt("DrugUnitToken", tokenAddr);
  
  console.log("⏳ Initializing inventory for systemic testing...");
  try {
    // We can use the dealer role we just granted to ourselves to record supply
    tx = await token.recordSupply(deployer.address, 1, 500); // 500 units of Drug #1
    await tx.wait();
    tx = await token.recordSupply(deployer.address, 2, 500); // 500 units of Drug #2
    await tx.wait();
    console.log("✅ Initialized 500 units of each drug in the system wallet inventory.");

    // BRIDGE: Link Registry to Token so Token can deduct units
    const registryAddr = deployment.contracts.PrescriptionRegistry;
    const registry = await hre.ethers.getContractAt("PrescriptionRegistry", registryAddr);
    console.log("⏳ Linking Registry to Token contract for automated deduction...");
    tx = await registry.setTokenContract(tokenAddr);
    await tx.wait();
    console.log("✅ Registry linked to Token successfully.");
    
  } catch (e) {
    console.log("ℹ️ Contract bridging or inventory initialization skipped:", e.message);
  }

  console.log("\n🎉 Authorization sync complete! Backend address is now a poly-role superuser.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
