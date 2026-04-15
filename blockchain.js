import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadABI(contractName) {
    const artifactPath = path.resolve(__dirname, `./artifacts/contracts/${contractName}.sol/${contractName}.json`);
    if(fs.existsSync(artifactPath)) {
        return JSON.parse(fs.readFileSync(artifactPath, "utf-8")).abi;
    } else {
        console.warn(`\u26a0\ufe0f ${contractName} artifacts not found. Please compile hardhat first!`);
        return [];
    }
}

function getDeployedAddress(contractName) {
    const deploymentPath = path.resolve(__dirname, "./deployment.json");
    if (fs.existsSync(deploymentPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
            return data.contracts[contractName] || "0x0000000000000000000000000000000000000000";
        } catch (e) {
            console.error("\u274c Error reading deployment.json:", e);
        }
    }
    return "0x0000000000000000000000000000000000000000";
}

const accessABI = loadABI("MedChainAccess");
const registryABI = loadABI("PrescriptionRegistry");
const tokenABI = loadABI("DrugUnitToken");

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

const accessAddress = process.env.ACCESS_CONTRACT_ADDRESS || getDeployedAddress("MedChainAccess");
const registryAddress = process.env.REGISTRY_CONTRACT_ADDRESS || getDeployedAddress("PrescriptionRegistry");
const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS || getDeployedAddress("DrugUnitToken");

const accessContract = new ethers.Contract(accessAddress, accessABI, wallet);
const registryContract = new ethers.Contract(registryAddress, registryABI, wallet);
const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);

export { 
    provider, 
    wallet, 
    accessContract, 
    registryContract, 
    tokenContract, 
    ethers, 
    accessAddress, 
    registryAddress, 
    tokenAddress 
};
