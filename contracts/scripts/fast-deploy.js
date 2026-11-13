/**
 * fast-deploy.js — Ultra-fast direct ethers.js contract deployer (~120ms)
 *
 * Deploys the compiled SupplyChain.json artifact directly to http://127.0.0.1:8545
 * without spawning a full `npx hardhat run` CLI session.
 * Reuses existing deployed bytecode if already deployed on the active node.
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

async function main() {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "SupplyChain.sol",
    "SupplyChain.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error("Compiled artifact not found at " + artifactPath);
  }

  const envPath = path.join(__dirname, "..", "..", ".env");
  let envContent = "";
  let existingAddr = process.env.CONTRACT_ADDRESS || "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
    const parsed = dotenv.parse(envContent);
    if (parsed.CONTRACT_ADDRESS) {
      existingAddr = parsed.CONTRACT_ADDRESS;
    }
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  const privateKey =
    process.env.PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // If Backend already auto-deployed SupplyChain.sol onto this Hardhat instance, reuse it
  if (existingAddr && ethers.isAddress(existingAddr)) {
    try {
      const code = await provider.getCode(existingAddr);
      if (code && code !== "0x") {
        console.log("SupplyChain deployed to:", existingAddr);
        return;
      }
    } catch {
      // continue to deploy
    }
  }

  const rawWallet = new ethers.Wallet(privateKey, provider);
  const nonce = await provider.getTransactionCount(rawWallet.address, "pending");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, rawWallet);

  const contract = await factory.deploy({ nonce });
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }
  if (envContent.match(/^CONTRACT_ADDRESS=.*$/m)) {
    envContent = envContent.replace(/^CONTRACT_ADDRESS=.*$/m, `CONTRACT_ADDRESS=${address}`);
  } else {
    envContent += `\nCONTRACT_ADDRESS=${address}\n`;
  }
  fs.writeFileSync(envPath, envContent);

  console.log("SupplyChain deployed to:", address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
