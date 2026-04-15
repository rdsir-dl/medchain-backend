import hre from "hardhat";

async function main() {
    const registryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const tokenAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    
    const [deployer] = await hre.ethers.getSigners();
    const registry = await hre.ethers.getContractAt("PrescriptionRegistry", registryAddress, deployer);
    
    const tx = await registry.setTokenContract(tokenAddress);
    await tx.wait();
    console.log("Token linked successfully!");
}

main();
