const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// The contract ABI is copied here after `npx hardhat compile` in /contracts.
// See contracts/artifacts/contracts/SupplyChain.sol/SupplyChain.json
let abi = null;
const abiPath = path.join(
  __dirname,
  "..",
  "..",
  "contracts",
  "artifacts",
  "contracts",
  "SupplyChain.sol",
  "SupplyChain.json"
);

function loadAbi() {
  if (abi) return abi;
  if (!fs.existsSync(abiPath)) {
    return null;
  }
  const artifact = JSON.parse(fs.readFileSync(abiPath, "utf-8"));
  abi = artifact.abi;
  return abi;
}

function getContract() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const contractAbi = loadAbi();

  if (!contractAddress || !privateKey || !contractAbi) {
    return null; // blockchain not configured/deployed yet
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, contractAbi, wallet);
}

/**
 * Get the signer wallet address (for recording on-chain)
 */
function getSignerAddress() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}

/**
 * Records a product/batch creation on-chain.
 * Returns { txHash, status } — never throws; caller decides how to handle failure.
 */
async function recordBatchOnChain({ batchId, farmerId }) {
  try {
    const contract = getContract();
    if (!contract) {
      return { txHash: null, status: "FAILED", reason: "blockchain_not_configured" };
    }
    // Use the signer's address (the backend's Ethereum address) for recording on-chain
    // In a real system, users would have their own wallets
    const signerAddress = getSignerAddress();
    if (!signerAddress) {
      return { txHash: null, status: "FAILED", reason: "signer_address_not_available" };
    }
    const tx = await contract.createProduct(batchId, signerAddress);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, status: "CONFIRMED" };
  } catch (err) {
    console.error("[blockchain] recordBatchOnChain failed:", err.message);
    return { txHash: null, status: "FAILED", reason: err.message };
  }
}

/**
 * Records a supply chain event on-chain.
 */
async function recordEventOnChain({ batchId, eventType, participant, dataHash, location }) {
  try {
    const contract = getContract();
    if (!contract) {
      return { txHash: null, status: "FAILED", reason: "blockchain_not_configured" };
    }
    const tx = await contract.addSupplyChainEvent(
      batchId,
      eventType,
      participant,
      dataHash || ethers.ZeroHash,
      location || ""
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash, status: "CONFIRMED" };
  } catch (err) {
    console.error("[blockchain] recordEventOnChain failed:", err.message);
    return { txHash: null, status: "FAILED", reason: err.message };
  }
}

/**
 * Records a certificate hash on-chain.
 */
async function recordCertificateOnChain({ batchId, certificateId, certificateHash, verifier }) {
  try {
    const contract = getContract();
    if (!contract) {
      return { txHash: null, status: "FAILED", reason: "blockchain_not_configured" };
    }
    const tx = await contract.addCertificateHash(batchId, certificateId, certificateHash, verifier);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, status: "CONFIRMED" };
  } catch (err) {
    console.error("[blockchain] recordCertificateOnChain failed:", err.message);
    return { txHash: null, status: "FAILED", reason: err.message };
  }
}

module.exports = {
  recordBatchOnChain,
  recordEventOnChain,
  recordCertificateOnChain,
  getSignerAddress,
  isConfigured: () => !!getContract(),
};
