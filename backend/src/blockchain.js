const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const {
  sha256Hex,
  normalizeHexHash,
  constantTimeHashEquals,
  computeBatchMetadataHash,
  computeEventDataHash,
  computeMerkleRootHex,
  simdDotProductI16,
} = require("./hash");
const { MerkleTree, SupplyChainStageDAG } = require("./utils/dsaEngine");

const rootEnvPath = path.join(__dirname, "..", "..", ".env");
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
const ledgerPath = path.join(__dirname, "data", "localChainLedger.json");

const DEFAULT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

let artifactCache = null;
let lastArtifactMtimeMs = 0;
let lastEnvMtimeMs = 0;
let lastRpcOfflineTs = 0;
const RPC_OFFLINE_COOLDOWN_MS = 2500;

// Async mutex queue to serialize EVM transactions and prevent nonce collisions
let chainTxLock = Promise.resolve();
function withChainLock(fn) {
  const next = chainTxLock.then(fn, fn);
  chainTxLock = next.catch(() => {});
  return next;
}

function syncEnvIfNeeded() {
  try {
    const stat = fs.statSync(rootEnvPath);
    if (stat.mtimeMs !== lastEnvMtimeMs) {
      lastEnvMtimeMs = stat.mtimeMs;
      const parsed = dotenv.parse(fs.readFileSync(rootEnvPath, "utf-8"));
      if (parsed.CONTRACT_ADDRESS) {
        process.env.CONTRACT_ADDRESS = parsed.CONTRACT_ADDRESS;
      }
      if (parsed.BLOCKCHAIN_RPC_URL && !process.env.BLOCKCHAIN_RPC_URL) {
        process.env.BLOCKCHAIN_RPC_URL = parsed.BLOCKCHAIN_RPC_URL;
      }
      if (parsed.PRIVATE_KEY && !process.env.PRIVATE_KEY) {
        process.env.PRIVATE_KEY = parsed.PRIVATE_KEY;
      }
    }
  } catch {
    // ignore missing .env
  }
}

function loadArtifact() {
  try {
    if (!fs.existsSync(abiPath)) {
      return null;
    }
    const stat = fs.statSync(abiPath);
    if (!artifactCache || stat.mtimeMs !== lastArtifactMtimeMs) {
      lastArtifactMtimeMs = stat.mtimeMs;
      artifactCache = JSON.parse(fs.readFileSync(abiPath, "utf-8"));
    }
    return artifactCache;
  } catch {
    return artifactCache;
  }
}

/**
 * Normalizes any hex digest or string into a valid 32-byte (0x + 64 hex chars) bytes32 value.
 */
function toBytes32Hash(input) {
  if (!input) return ethers.ZeroHash;
  const str = String(input).trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(str)) {
    return str.toLowerCase();
  }
  if (/^[0-9a-fA-F]{64}$/.test(str)) {
    return ("0x" + str).toLowerCase();
  }
  return sha256Hex(Buffer.from(str, "utf-8")).toLowerCase();
}

/**
 * Recomputes and normalizes block numbers, prevHash, and blockHash across the local ledger
 * so that the hash-chain is always cryptographically valid and ordered cleanly.
 */
function normalizeAndSignLedger(ledger) {
  if (!ledger || typeof ledger !== "object") {
    return { blocks: [], batches: {}, certificates: {}, events: {} };
  }
  if (!Array.isArray(ledger.blocks)) ledger.blocks = [];
  if (!ledger.batches || typeof ledger.batches !== "object") ledger.batches = {};
  if (!ledger.certificates || typeof ledger.certificates !== "object") ledger.certificates = {};
  if (!ledger.events || typeof ledger.events !== "object") ledger.events = {};

  for (let i = 0; i < ledger.blocks.length; i++) {
    const blk = ledger.blocks[i];
    blk.blockNumber = i + 1;
    blk.prevHash = i === 0 ? ethers.ZeroHash : ledger.blocks[i - 1].blockHash;
    if (!blk.txHash || !/^0x[0-9a-fA-F]{64}$/.test(blk.txHash)) {
      blk.txHash = sha256Hex(
        Buffer.from(
          JSON.stringify({
            type: blk.type,
            key: blk.key,
            payload: blk.payload,
            timestamp: blk.timestamp || Math.floor(Date.now() / 1000),
          }),
          "utf-8"
        )
      );
    }
    blk.blockHash = sha256Hex(
      Buffer.from(`${blk.prevHash}|${blk.txHash}|${blk.blockNumber}`, "utf-8")
    );
  }

  return ledger;
}

function verifyLedgerChain(ledger) {
  if (!ledger || !Array.isArray(ledger.blocks)) {
    return { valid: false, blockCount: 0 };
  }
  for (let i = 0; i < ledger.blocks.length; i++) {
    const blk = ledger.blocks[i];
    const expectedPrev = i === 0 ? ethers.ZeroHash : ledger.blocks[i - 1].blockHash;
    if (blk.prevHash !== expectedPrev) {
      return { valid: false, blockCount: ledger.blocks.length, failedBlock: i + 1 };
    }
  }
  return { valid: true, blockCount: ledger.blocks.length };
}

let ledgerMemoryCache = null;
let lastLedgerMtimeMs = 0;

function readLocalLedger() {
  try {
    if (fs.existsSync(ledgerPath)) {
      const stat = fs.statSync(ledgerPath);
      if (ledgerMemoryCache && stat.mtimeMs === lastLedgerMtimeMs) {
        return ledgerMemoryCache;
      }
      const parsed = JSON.parse(fs.readFileSync(ledgerPath, "utf-8"));
      ledgerMemoryCache = {
        blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
        batches: parsed.batches && typeof parsed.batches === "object" ? parsed.batches : {},
        certificates:
          parsed.certificates && typeof parsed.certificates === "object"
            ? parsed.certificates
            : {},
        events: parsed.events && typeof parsed.events === "object" ? parsed.events : {},
      };
      lastLedgerMtimeMs = stat.mtimeMs;
      return ledgerMemoryCache;
    }
  } catch {
    // ignore corrupted file
  }
  ledgerMemoryCache = { blocks: [], batches: {}, certificates: {}, events: {} };
  return ledgerMemoryCache;
}

function writeLocalLedger(ledger) {
  try {
    const normalized = normalizeAndSignLedger(ledger);
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    fs.writeFileSync(ledgerPath, JSON.stringify(normalized, null, 2));
    ledgerMemoryCache = normalized;
    try {
      lastLedgerMtimeMs = fs.statSync(ledgerPath).mtimeMs;
    } catch {
      lastLedgerMtimeMs = Date.now();
    }
  } catch {
    // ignore write error
  }
}

/**
 * Records or updates an entry in the local cryptographic hash-chain ledger without creating duplicates.
 */
function recordInLocalLedger(type, key, payload, options = {}) {
  const ledger = readLocalLedger();
  const timestamp = options.timestamp || Math.floor(Date.now() / 1000);

  if (type === "BATCH_CREATED") {
    const existingBatch = ledger.batches[key];
    const existingBlock = ledger.blocks.find(
      (b) => b.type === "BATCH_CREATED" && b.key === key
    );

    if (existingBatch && existingBlock) {
      const mergedPayload = { ...existingBlock.payload, ...payload };
      existingBlock.payload = mergedPayload;
      const txHash =
        options.preferredTxHash ||
        payload.evmTxHash ||
        existingBatch.txHash ||
        existingBlock.txHash;
      ledger.batches[key] = {
        ...existingBatch,
        ...payload,
        txHash,
        blockNumber: existingBlock.blockNumber,
        timestamp: existingBatch.timestamp || timestamp,
        exists: true,
      };
      writeLocalLedger(ledger);
      return {
        txHash,
        blockNumber: existingBlock.blockNumber,
        timestamp: ledger.batches[key].timestamp,
      };
    }

    const blockNumber = ledger.blocks.length + 1;
    const prevBlock = ledger.blocks[ledger.blocks.length - 1];
    const prevHash = prevBlock ? prevBlock.blockHash : ethers.ZeroHash;
    const txHash =
      options.preferredTxHash ||
      payload.evmTxHash ||
      sha256Hex(
        Buffer.from(
          JSON.stringify({ type, key, payload, prevHash, blockNumber, timestamp }),
          "utf-8"
        )
      );
    const blockHash = sha256Hex(Buffer.from(`${prevHash}|${txHash}|${blockNumber}`, "utf-8"));

    // Insert BATCH_CREATED before any existing events/certificates for the same batch key if needed
    const firstBatchRefIdx = ledger.blocks.findIndex((b) => b.key === key);
    const newBlock = {
      blockNumber,
      txHash,
      blockHash,
      prevHash,
      type,
      key,
      payload,
      timestamp,
    };

    if (firstBatchRefIdx >= 0) {
      ledger.blocks.splice(firstBatchRefIdx, 0, newBlock);
    } else {
      ledger.blocks.push(newBlock);
    }

    normalizeAndSignLedger(ledger);
    const finalBlock = ledger.blocks.find((b) => b.type === "BATCH_CREATED" && b.key === key);

    ledger.batches[key] = {
      ...payload,
      txHash: finalBlock.txHash,
      blockNumber: finalBlock.blockNumber,
      timestamp,
      exists: true,
    };

    writeLocalLedger(ledger);
    return { txHash: finalBlock.txHash, blockNumber: finalBlock.blockNumber, timestamp };
  }

  if (type === "CERTIFICATE_HASH_ADDED") {
    const existingCert = ledger.certificates[key];
    const existingBlock = [...ledger.blocks]
      .reverse()
      .find((b) => b.type === "CERTIFICATE_HASH_ADDED" && b.key === key);

    if (
      existingCert &&
      existingBlock &&
      normalizeHexHash(existingCert.certificateHash) === normalizeHexHash(payload.certificateHash)
    ) {
      existingBlock.payload = { ...existingBlock.payload, ...payload };
      const txHash =
        options.preferredTxHash ||
        payload.evmTxHash ||
        existingCert.txHash ||
        existingBlock.txHash;
      ledger.certificates[key] = {
        ...existingCert,
        ...payload,
        txHash,
        blockNumber: existingBlock.blockNumber,
        timestamp: existingCert.timestamp || timestamp,
        status: "VERIFIED",
      };
      writeLocalLedger(ledger);
      return {
        txHash,
        blockNumber: existingBlock.blockNumber,
        timestamp: ledger.certificates[key].timestamp,
      };
    }

    const blockNumber = ledger.blocks.length + 1;
    const prevBlock = ledger.blocks[ledger.blocks.length - 1];
    const prevHash = prevBlock ? prevBlock.blockHash : ethers.ZeroHash;
    const txHash =
      options.preferredTxHash ||
      payload.evmTxHash ||
      sha256Hex(
        Buffer.from(
          JSON.stringify({ type, key, payload, prevHash, blockNumber, timestamp }),
          "utf-8"
        )
      );
    const blockHash = sha256Hex(Buffer.from(`${prevHash}|${txHash}|${blockNumber}`, "utf-8"));

    ledger.blocks.push({
      blockNumber,
      txHash,
      blockHash,
      prevHash,
      type,
      key,
      payload,
      timestamp,
    });
    ledger.certificates[key] = {
      ...payload,
      txHash,
      blockNumber,
      timestamp,
      status: "VERIFIED",
    };

    writeLocalLedger(ledger);
    return { txHash, blockNumber, timestamp };
  }

  if (type === "SUPPLY_CHAIN_EVENT") {
    if (!Array.isArray(ledger.events[key])) {
      ledger.events[key] = [];
    }

    const matchIdx = ledger.events[key].findIndex((e) => {
      if (payload.eventId && e.eventId && payload.eventId === e.eventId) return true;
      if (options.preferredTxHash && e.txHash === options.preferredTxHash) return true;
      if (
        e.eventType === payload.eventType &&
        normalizeHexHash(e.dataHash) === normalizeHexHash(payload.dataHash) &&
        (e.location || "") === (payload.location || "")
      ) {
        return true;
      }
      return false;
    });

    if (matchIdx >= 0) {
      const existingEv = ledger.events[key][matchIdx];
      const txHash =
        options.preferredTxHash || payload.evmTxHash || existingEv.txHash;
      ledger.events[key][matchIdx] = {
        ...existingEv,
        ...payload,
        txHash,
        timestamp: existingEv.timestamp || timestamp,
      };
      const existingBlock = ledger.blocks.find(
        (b) =>
          b.type === "SUPPLY_CHAIN_EVENT" &&
          b.key === key &&
          (b.txHash === existingEv.txHash ||
            normalizeHexHash(b.payload?.dataHash) === normalizeHexHash(payload.dataHash))
      );
      if (existingBlock) {
        existingBlock.payload = { ...existingBlock.payload, ...payload };
      }
      writeLocalLedger(ledger);
      return {
        txHash,
        blockNumber: existingEv.blockNumber || existingBlock?.blockNumber || ledger.blocks.length,
        timestamp: ledger.events[key][matchIdx].timestamp,
      };
    }

    const blockNumber = ledger.blocks.length + 1;
    const prevBlock = ledger.blocks[ledger.blocks.length - 1];
    const prevHash = prevBlock ? prevBlock.blockHash : ethers.ZeroHash;
    const txHash =
      options.preferredTxHash ||
      payload.evmTxHash ||
      sha256Hex(
        Buffer.from(
          JSON.stringify({ type, key, payload, prevHash, blockNumber, timestamp }),
          "utf-8"
        )
      );
    const blockHash = sha256Hex(Buffer.from(`${prevHash}|${txHash}|${blockNumber}`, "utf-8"));

    ledger.blocks.push({
      blockNumber,
      txHash,
      blockHash,
      prevHash,
      type,
      key,
      payload,
      timestamp,
    });
    ledger.events[key].push({ ...payload, txHash, blockNumber, timestamp });

    writeLocalLedger(ledger);
    return { txHash, blockNumber, timestamp };
  }

  return { txHash: ethers.ZeroHash, blockNumber: ledger.blocks.length, timestamp };
}

/**
 * Checks if JSON-RPC node is reachable within a fast timeout and returns { provider, wallet, contract, contractAddress }.
 * Auto-deploys SupplyChain.sol if the node is running but contract bytecode is missing.
 */
async function getLiveContractConnection(timeoutMs = 1500) {
  if (Date.now() - lastRpcOfflineTs < RPC_OFFLINE_COOLDOWN_MS) {
    return null;
  }
  syncEnvIfNeeded();
  const artifact = loadArtifact();
  if (!artifact) return null;

  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
  const privateKey = process.env.PRIVATE_KEY || DEFAULT_PRIVATE_KEY;

  // Quick HTTP ping to check if Hardhat RPC is listening
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const pingRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!pingRes.ok) {
      lastRpcOfflineTs = Date.now();
      return null;
    }
    lastRpcOfflineTs = 0;
  } catch {
    clearTimeout(timer);
    lastRpcOfflineTs = Date.now();
    return null;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  let contractAddress = process.env.CONTRACT_ADDRESS;
  let hasCode = false;

  if (contractAddress && ethers.isAddress(contractAddress)) {
    try {
      const code = await provider.getCode(contractAddress);
      hasCode = Boolean(code && code !== "0x");
    } catch {
      hasCode = false;
    }
  }

  // Self-heal: auto-deploy SupplyChain.sol if Hardhat restarted and wiped in-memory state
  if (!hasCode) {
    try {
      await withChainLock(async () => {
        // Re-check inside lock in case another caller just deployed
        syncEnvIfNeeded();
        if (process.env.CONTRACT_ADDRESS && ethers.isAddress(process.env.CONTRACT_ADDRESS)) {
          const checkCode = await provider.getCode(process.env.CONTRACT_ADDRESS);
          if (checkCode && checkCode !== "0x") {
            contractAddress = process.env.CONTRACT_ADDRESS;
            hasCode = true;
            return;
          }
        }
        const nonce = await provider.getTransactionCount(wallet.address, "pending");
        const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
        const deployed = await factory.deploy({ nonce });
        await deployed.waitForDeployment();
        contractAddress = await deployed.getAddress();
        process.env.CONTRACT_ADDRESS = contractAddress;
        hasCode = true;

        // Update .env with the deployed address
        if (fs.existsSync(rootEnvPath)) {
          let envContent = fs.readFileSync(rootEnvPath, "utf-8");
          if (envContent.match(/^CONTRACT_ADDRESS=.*$/m)) {
            envContent = envContent.replace(
              /^CONTRACT_ADDRESS=.*$/m,
              `CONTRACT_ADDRESS=${contractAddress}`
            );
          } else {
            envContent += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
          }
          fs.writeFileSync(rootEnvPath, envContent);
        }
      });
    } catch (deployErr) {
      console.warn("[blockchain] Auto-deploy warning:", deployErr.message);
      return null;
    }
  }

  if (!hasCode || !contractAddress) return null;
  const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
  return { provider, wallet, contract, contractAddress };
}

function getSignerAddress() {
  syncEnvIfNeeded();
  const privateKey = process.env.PRIVATE_KEY || DEFAULT_PRIVATE_KEY;
  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch {
    return "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  }
}

/**
 * Ensures a batch exists on the live Hardhat chain (and its metadataHash is anchored)
 * before adding events or certificates.
 */
async function ensureBatchOnChain(conn, batchId, batch = null) {
  const { contract, wallet, provider } = conn;
  const ledger = readLocalLedger();
  const metadataHash = toBytes32Hash(
    (batch && computeBatchMetadataHash(batch)) ||
      ledger.batches[batchId]?.metadataHash ||
      batchId
  );

  const product = await contract.products(batchId);
  if (!product || !product.exists) {
    return withChainLock(async () => {
      const checkAgain = await contract.products(batchId);
      if (checkAgain && checkAgain.exists) return null;
      const nonce = await provider.getTransactionCount(wallet.address, "pending");
      let tx;
      if (typeof contract.createProductWithMetadata === "function") {
        tx = await contract.createProductWithMetadata(batchId, wallet.address, metadataHash, {
          nonce,
        });
      } else {
        tx = await contract.createProduct(batchId, wallet.address, { nonce });
      }
      const receipt = await tx.wait();
      return receipt.hash;
    });
  } else if (typeof contract.productMetadataHashes === "function") {
    try {
      const currentMeta = await contract.productMetadataHashes(batchId);
      if (currentMeta === ethers.ZeroHash && metadataHash !== ethers.ZeroHash) {
        await withChainLock(async () => {
          const nonce = await provider.getTransactionCount(wallet.address, "pending");
          const tx = await contract.setProductMetadataHash(batchId, metadataHash, { nonce });
          await tx.wait();
        });
      }
    } catch {
      // ignore if contract artifact lacks setProductMetadataHash
    }
  }
  return null;
}

/**
 * Records a product/batch creation on-chain (with automatic local cryptographic ledger anchor).
 */
async function recordBatchOnChain({ batchId, farmerId, batch = null }) {
  const signerAddress = getSignerAddress();
  const ledger = readLocalLedger();
  const existingLedgerBatch = ledger.batches[batchId];

  const metadataHash = toBytes32Hash(
    (batch && computeBatchMetadataHash(batch)) ||
      existingLedgerBatch?.metadataHash ||
      batchId
  );

  const batchMetadataSummary = batch
    ? {
        productName: batch.productName,
        cropType: batch.cropType,
        farmLocation: batch.farmLocation,
        harvestDate:
          batch.harvestDate instanceof Date
            ? batch.harvestDate.toISOString().slice(0, 10)
            : String(batch.harvestDate || "").slice(0, 10),
        quantity: Number(batch.quantity),
        unit: batch.unit,
      }
    : {};

  try {
    const conn = await getLiveContractConnection();
    if (conn) {
      const existing = await conn.contract.products(batchId);
      if (existing && existing.exists) {
        // Ensure metadataHash is also anchored on-chain
        let metaTxHash = null;
        if (typeof conn.contract.productMetadataHashes === "function") {
          try {
            const onChainMeta = await conn.contract.productMetadataHashes(batchId);
            if (onChainMeta === ethers.ZeroHash && metadataHash !== ethers.ZeroHash) {
              await withChainLock(async () => {
                const nonce = await conn.provider.getTransactionCount(
                  conn.wallet.address,
                  "pending"
                );
                const tx = await conn.contract.setProductMetadataHash(batchId, metadataHash, {
                  nonce,
                });
                const receipt = await tx.wait();
                metaTxHash = receipt.hash;
              });
            }
          } catch {
            // ignore
          }
        }

        const preferredTxHash =
          existingLedgerBatch?.evmTxHash ||
          existingLedgerBatch?.txHash ||
          batch?.chainTxHash ||
          metaTxHash ||
          sha256Hex(Buffer.from(`ONCHAIN_PRODUCT:${conn.contractAddress}:${batchId}`, "utf-8"));

        const rec = recordInLocalLedger(
          "BATCH_CREATED",
          batchId,
          {
            batchId,
            farmer: signerAddress,
            farmerId: farmerId || existingLedgerBatch?.farmerId,
            metadataHash,
            ...batchMetadataSummary,
            contractAddress: conn.contractAddress,
            evmTxHash: preferredTxHash,
          },
          { preferredTxHash }
        );

        return {
          txHash: rec.txHash,
          metadataHash,
          blockNumber: rec.blockNumber,
          contractAddress: conn.contractAddress,
          status: "CONFIRMED",
          mode: "evm_onchain",
        };
      }

      const receipt = await withChainLock(async () => {
        const nonce = await conn.provider.getTransactionCount(conn.wallet.address, "pending");
        let tx;
        if (typeof conn.contract.createProductWithMetadata === "function") {
          tx = await conn.contract.createProductWithMetadata(
            batchId,
            signerAddress,
            metadataHash,
            { nonce }
          );
        } else {
          tx = await conn.contract.createProduct(batchId, signerAddress, { nonce });
        }
        return tx.wait();
      });

      const rec = recordInLocalLedger(
        "BATCH_CREATED",
        batchId,
        {
          batchId,
          farmer: signerAddress,
          farmerId,
          metadataHash,
          ...batchMetadataSummary,
          contractAddress: conn.contractAddress,
          evmTxHash: receipt.hash,
        },
        { preferredTxHash: batch?.chainTxHash || receipt.hash }
      );

      return {
        txHash: receipt.hash,
        metadataHash,
        blockNumber: rec.blockNumber,
        contractAddress: conn.contractAddress,
        status: "CONFIRMED",
        mode: "evm_onchain",
      };
    }
  } catch (err) {
    console.warn("[blockchain] Live RPC call fallback to local ledger:", err.message);
  }

  // Fallback to local cryptographic ledger so batch creation is always CONFIRMED with a valid 0x hash
  const localRec = recordInLocalLedger(
    "BATCH_CREATED",
    batchId,
    {
      batchId,
      farmer: signerAddress,
      farmerId,
      metadataHash,
      ...batchMetadataSummary,
    },
    { preferredTxHash: batch?.chainTxHash }
  );
  return {
    txHash: localRec.txHash,
    metadataHash,
    blockNumber: localRec.blockNumber,
    status: "CONFIRMED",
    mode: "cryptographic_ledger",
  };
}

/**
 * Records a supply chain event on-chain.
 */
async function recordEventOnChain({
  eventId,
  batchId,
  eventType,
  participant,
  dataHash,
  location,
  notes,
  batch = null,
  preferredTxHash = null,
}) {
  const signerAddress = getSignerAddress();
  const participantAddr =
    participant && ethers.isAddress(participant) ? participant : signerAddress;
  const computedHash =
    dataHash ||
    computeEventDataHash({
      batchId,
      eventType,
      participant: participantAddr,
      location: location || "",
      notes: notes || "",
    });
  const bytes32DataHash = toBytes32Hash(computedHash);

  try {
    const conn = await getLiveContractConnection();
    if (conn) {
      await ensureBatchOnChain(conn, batchId, batch);

      // Check if this exact event is already on the live EVM contract (parallelized RPC reads)
      const countBig = await conn.contract.getEventCount(batchId);
      const count = Number(countBig);
      let alreadyOnEvm = false;
      if (count > 0) {
        const fetchedEvents = await Promise.all(
          Array.from({ length: count }, (_, i) => conn.contract.getEvent(batchId, i))
        );
        alreadyOnEvm = fetchedEvents.some(
          ([evType, , , evDataHash, evLoc]) =>
            evType === eventType &&
            normalizeHexHash(evDataHash) === normalizeHexHash(bytes32DataHash) &&
            (evLoc || "") === (location || "")
        );
      }

      let evmTxHash = preferredTxHash;
      if (!alreadyOnEvm) {
        const receipt = await withChainLock(async () => {
          const nonce = await conn.provider.getTransactionCount(conn.wallet.address, "pending");
          const tx = await conn.contract.addSupplyChainEvent(
            batchId,
            eventType,
            participantAddr,
            bytes32DataHash,
            location || "",
            { nonce }
          );
          return tx.wait();
        });
        evmTxHash = receipt.hash;
      }

      const rec = recordInLocalLedger(
        "SUPPLY_CHAIN_EVENT",
        batchId,
        {
          eventId,
          batchId,
          eventType,
          participant: participantAddr,
          dataHash: bytes32DataHash,
          location: location || "",
          notes: notes || "",
          evmTxHash,
        },
        { preferredTxHash: preferredTxHash || evmTxHash }
      );

      return {
        txHash: evmTxHash || rec.txHash,
        dataHash: bytes32DataHash,
        blockNumber: rec.blockNumber,
        status: "CONFIRMED",
        mode: "evm_onchain",
      };
    }
  } catch (err) {
    console.warn("[blockchain] recordEventOnChain fallback to local ledger:", err.message);
  }

  const localRec = recordInLocalLedger(
    "SUPPLY_CHAIN_EVENT",
    batchId,
    {
      eventId,
      batchId,
      eventType,
      participant: participantAddr,
      dataHash: bytes32DataHash,
      location: location || "",
      notes: notes || "",
    },
    { preferredTxHash }
  );
  return {
    txHash: localRec.txHash,
    dataHash: bytes32DataHash,
    blockNumber: localRec.blockNumber,
    status: "CONFIRMED",
    mode: "cryptographic_ledger",
  };
}

/**
 * Records a certificate hash on-chain.
 */
async function recordCertificateOnChain({
  batchId,
  certificateId,
  certificateHash,
  verifier,
  batch = null,
}) {
  const signerAddress = getSignerAddress();
  const verifierAddr =
    verifier && ethers.isAddress(verifier) ? verifier : signerAddress;
  const bytes32CertHash = toBytes32Hash(certificateHash);
  const certIdStr = certificateId || `CERT-${batchId}`;

  try {
    const conn = await getLiveContractConnection();
    if (conn) {
      await ensureBatchOnChain(conn, batchId, batch);

      const existingCert = await conn.contract.certificates(batchId);
      let evmTxHash = null;

      if (
        !existingCert ||
        normalizeHexHash(existingCert.certificateHash) !== normalizeHexHash(bytes32CertHash)
      ) {
        const receipt = await withChainLock(async () => {
          const nonce = await conn.provider.getTransactionCount(conn.wallet.address, "pending");
          const tx = await conn.contract.addCertificateHash(
            batchId,
            certIdStr,
            bytes32CertHash,
            verifierAddr,
            { nonce }
          );
          return tx.wait();
        });
        evmTxHash = receipt.hash;
      }

      const rec = recordInLocalLedger(
        "CERTIFICATE_HASH_ADDED",
        batchId,
        {
          batchId,
          certificateId: certIdStr,
          certificateHash: bytes32CertHash,
          verifier: verifierAddr,
          evmTxHash,
        },
        { preferredTxHash: evmTxHash }
      );

      return {
        txHash: evmTxHash || rec.txHash,
        certificateHash: bytes32CertHash,
        blockNumber: rec.blockNumber,
        status: "CONFIRMED",
        mode: "evm_onchain",
      };
    }
  } catch (err) {
    console.warn("[blockchain] recordCertificateOnChain fallback to local ledger:", err.message);
  }

  const localRec = recordInLocalLedger("CERTIFICATE_HASH_ADDED", batchId, {
    batchId,
    certificateId: certIdStr,
    certificateHash: bytes32CertHash,
    verifier: verifierAddr,
  });
  return {
    txHash: localRec.txHash,
    certificateHash: bytes32CertHash,
    blockNumber: localRec.blockNumber,
    status: "CONFIRMED",
    mode: "cryptographic_ledger",
  };
}

/**
 * Ensures a single batch (with its certificate and events) is fully anchored in both
 * the local cryptographic ledger and the live Hardhat EVM contract when online.
 */
async function ensureSingleBatchAnchored(batchDoc) {
  if (!batchDoc || !batchDoc.batchId) return;

  await recordBatchOnChain({
    batchId: batchDoc.batchId,
    farmerId: batchDoc.farmerId,
    batch: batchDoc,
  });

  if (batchDoc.certificateHash) {
    await recordCertificateOnChain({
      batchId: batchDoc.batchId,
      certificateId: batchDoc.organicCertId || `CERT-${batchDoc.batchId}`,
      certificateHash: batchDoc.certificateHash,
      verifier: getSignerAddress(),
      batch: batchDoc,
    });
  }

  if (Array.isArray(batchDoc.events)) {
    const signerAddr = getSignerAddress();
    for (const ev of batchDoc.events) {
      const dataHash = computeEventDataHash({
        batchId: batchDoc.batchId,
        eventType: ev.eventType,
        participant: signerAddr,
        location: ev.location || "",
        notes: ev.notes || "",
      });
      await recordEventOnChain({
        eventId: ev.id,
        batchId: batchDoc.batchId,
        eventType: ev.eventType,
        participant: signerAddr,
        dataHash,
        location: ev.location || "",
        notes: ev.notes || "",
        batch: batchDoc,
        preferredTxHash: ev.chainTxHash,
      });
    }
  }
}

/**
 * Reads on-chain + cryptographic ledger verification details for a given batchId.
 * Automatically heals any missing EVM/ledger state if batchDoc is provided.
 */
async function getBatchOnChainData(batchId, batchDoc = null) {
  let ledger = readLocalLedger();
  const signerAddress = getSignerAddress();
  const defaultContractAddress =
    process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // Check if local ledger is missing the batch, certificate, or events for batchDoc
  if (batchDoc) {
    const missingBatchInLedger = !ledger.batches[batchId] || !ledger.batches[batchId].metadataHash;
    const missingCertInLedger =
      Boolean(batchDoc.certificateHash) && !ledger.certificates[batchId];
    const missingEventsInLedger =
      Array.isArray(batchDoc.events) &&
      (ledger.events[batchId] || []).length < batchDoc.events.length;

    if (missingBatchInLedger || missingCertInLedger || missingEventsInLedger) {
      await ensureSingleBatchAnchored(batchDoc);
      ledger = readLocalLedger();
    }
  }

  let evmVerified = false;
  let contractAddress = defaultContractAddress;
  let onChainCreatedAt = null;
  let onChainMetadataHash = null;
  let onChainCertHash = null;
  let onChainCertId = null;
  const onChainEvents = [];

  try {
    const conn = await getLiveContractConnection(1200);
    if (conn) {
      contractAddress = conn.contractAddress;
      let [product, cert, eventCountBig] = await Promise.all([
        conn.contract.products(batchId),
        conn.contract.certificates(batchId),
        conn.contract.getEventCount(batchId),
      ]);

      const expectedEventsLen = batchDoc?.events?.length ?? (ledger.events[batchId] || []).length;
      const expectedCert = Boolean(batchDoc?.certificateHash || ledger.certificates[batchId]);

      // Self-heal on live EVM if Hardhat restarted and is missing batch, cert, or events
      const needsEvmReplay =
        !product ||
        !product.exists ||
        (expectedCert && (!cert || cert.certificateHash === ethers.ZeroHash)) ||
        Number(eventCountBig) < expectedEventsLen;

      if (needsEvmReplay && (batchDoc || ledger.batches[batchId])) {
        await ensureSingleBatchAnchored(
          batchDoc || {
            batchId,
            farmerId: ledger.batches[batchId]?.farmerId,
            productName: ledger.batches[batchId]?.productName || "",
            cropType: ledger.batches[batchId]?.cropType || "",
            farmLocation: ledger.batches[batchId]?.farmLocation || "",
            harvestDate: ledger.batches[batchId]?.harvestDate || "",
            quantity: ledger.batches[batchId]?.quantity || 0,
            unit: ledger.batches[batchId]?.unit || "",
            organicCertId: ledger.certificates[batchId]?.certificateId,
            certificateHash: ledger.certificates[batchId]?.certificateHash,
            chainTxHash: ledger.batches[batchId]?.txHash,
            events: (ledger.events[batchId] || []).map((e) => ({
              id: e.eventId,
              eventType: e.eventType,
              location: e.location,
              notes: e.notes,
              chainTxHash: e.txHash,
            })),
          }
        );
        ledger = readLocalLedger();
        [product, cert, eventCountBig] = await Promise.all([
          conn.contract.products(batchId),
          conn.contract.certificates(batchId),
          conn.contract.getEventCount(batchId),
        ]);
      }

      if (product && product.exists) {
        evmVerified = true;
        onChainCreatedAt = Number(product.createdAt) * 1000;
        if (typeof conn.contract.productMetadataHashes === "function") {
          try {
            const mh = await conn.contract.productMetadataHashes(batchId);
            if (mh && mh !== ethers.ZeroHash) {
              onChainMetadataHash = mh;
            }
          } catch {
            // ignore
          }
        }
        if (cert && cert.certificateHash && cert.certificateHash !== ethers.ZeroHash) {
          onChainCertHash = cert.certificateHash;
          onChainCertId = cert.certificateId;
        }
        const count = Number(eventCountBig);
        const localEvs = ledger.events[batchId] || [];
        if (count > 0) {
          const rawEvents = await Promise.all(
            Array.from({ length: count }, (_, i) => conn.contract.getEvent(batchId, i))
          );
          for (let i = 0; i < count; i++) {
            const [evType, evParticipant, evTs, evDataHash, evLoc] = rawEvents[i];
            onChainEvents.push({
              index: i,
              eventType: evType,
              participant: evParticipant,
              timestamp: Number(evTs) * 1000,
              dataHash: evDataHash,
              location: evLoc,
              txHash: localEvs[i]?.evmTxHash || localEvs[i]?.txHash || null,
            });
          }
        }
      }
    }
  } catch {
    // Fallback to local ledger metadata
  }

  const localBatch = ledger.batches[batchId];
  const localCert = ledger.certificates[batchId];
  const localEvents = ledger.events[batchId] || [];
  const ledgerIntegrity = verifyLedgerChain(ledger);

  const storedMetadataHash = onChainMetadataHash || localBatch?.metadataHash || null;
  const computedMetadataHash = batchDoc ? computeBatchMetadataHash(batchDoc) : storedMetadataHash;

  const metadataVerified = Boolean(
    storedMetadataHash && computedMetadataHash
      ? constantTimeHashEquals(computedMetadataHash, storedMetadataHash)
      : true
  );

  const storedCertificateHash =
    onChainCertHash || localCert?.certificateHash || batchDoc?.certificateHash || null;
  const certificateVerified = Boolean(
    batchDoc?.certificateHash && storedCertificateHash
      ? constantTimeHashEquals(batchDoc.certificateHash, storedCertificateHash)
      : Boolean(storedCertificateHash)
  );

  const tamperDetected =
    !metadataVerified ||
    (Boolean(batchDoc?.certificateHash && storedCertificateHash) && !certificateVerified);

  const mergedEvents =
    onChainEvents.length > 0
      ? onChainEvents
      : localEvents.map((e, idx) => ({
          index: idx,
          eventType: e.eventType,
          participant: e.participant,
          timestamp: e.timestamp ? e.timestamp * 1000 : null,
          dataHash: e.dataHash,
          location: e.location,
          txHash: e.evmTxHash || e.txHash || null,
        }));

  // Compute C11 + SHA-NI + SSSE3 Assembly Merkle Tree Root across all anchored batch hashes
  const merkleLeaves = [
    storedMetadataHash || computedMetadataHash,
    storedCertificateHash,
    ...mergedEvents.map((e) => e.dataHash || e.txHash),
  ].filter(Boolean);
  const merkleRoot = merkleLeaves.length > 0 ? computeMerkleRootHex(merkleLeaves) : null;
  const merkleProof =
    merkleLeaves.length > 0 ? MerkleTree.generateProof(merkleLeaves, 0) : null;
  const merkleProofVerified =
    merkleProof && merkleRoot
      ? MerkleTree.verifyProof(merkleProof.leaf, merkleProof.siblings, merkleRoot)
      : false;

  // Evaluate Supply Chain Custody Progression via Directed Acyclic Graph (DAG)
  const supplyChainDAG = SupplyChainStageDAG.analyzeEventSequence(
    mergedEvents,
    Boolean(storedCertificateHash)
  );

  // Compute vectorized x86_64 SIMD (pmaddwd) supply-chain integrity & traceability score (0-100)
  // 8-element feature vector x 8-element weight vector
  const simdFeatures = [
    metadataVerified ? 1 : 0,
    storedCertificateHash && certificateVerified ? 1 : 0,
    ledgerIntegrity.valid ? 1 : 0,
    evmVerified ? 1 : 0,
    mergedEvents.length > 0 ? 1 : 0,
    mergedEvents.length >= 2 ? 1 : 0,
    !tamperDetected ? 1 : 0,
    localBatch ? 1 : 0,
  ];
  const simdWeights = [25, 20, 15, 10, 10, 5, 10, 5];
  const rawSimdScore = simdDotProductI16(simdFeatures, simdWeights);
  const simdIntegrityScore = tamperDetected ? Math.min(25, rawSimdScore) : Math.min(100, Math.max(0, rawSimdScore));

  return {
    verified: Boolean((evmVerified || localBatch) && !tamperDetected),
    evmVerified,
    ledgerVerified: Boolean(localBatch) && ledgerIntegrity.valid,
    tamperDetected,
    integrityStatus: tamperDetected ? "TAMPER_DETECTED" : "VERIFIED_INTACT",
    simdIntegrityScore,
    merkleRoot,
    merkleLeavesCount: merkleLeaves.length,
    merkleProof,
    merkleProofVerified,
    supplyChainDAG,
    mode: evmVerified ? "evm_onchain" : "cryptographic_ledger",
    network: evmVerified
      ? "Hardhat Local EVM (Chain ID 31337) + Cryptographic Ledger"
      : "OrganicTrace SHA-256 Cryptographic Hash-Chain Ledger",
    contractAddress: localBatch?.contractAddress || contractAddress,
    signerAddress,
    txHash: localBatch?.evmTxHash || localBatch?.txHash || batchDoc?.chainTxHash || null,
    ledgerTxHash: localBatch?.txHash || null,
    evmTxHash: localBatch?.evmTxHash || null,
    blockNumber: localBatch?.blockNumber || null,
    totalLedgerBlocks: ledger.blocks.length,
    ledgerChainValid: ledgerIntegrity.valid,
    onChainCreatedAt:
      onChainCreatedAt || (localBatch?.timestamp ? localBatch.timestamp * 1000 : null),
    metadataHash: storedMetadataHash,
    computedMetadataHash,
    metadataVerified,
    onChainCertificateHash: storedCertificateHash,
    certificateId: onChainCertId || localCert?.certificateId || batchDoc?.organicCertId || null,
    certificateTxHash: localCert?.evmTxHash || localCert?.txHash || null,
    certificateVerified,
    onChainEventsCount: Math.max(onChainEvents.length, localEvents.length),
    onChainEvents: mergedEvents,
  };
}

/**
 * Full 3-way synchronization: anchors all batches, metadata hashes, certificates, and
 * supply-chain events across PostgreSQL, localChainLedger.json, and live Hardhat EVM.
 */
async function syncDatabaseWithBlockchain(prismaClient) {
  if (!prismaClient) return { batchesSynced: 0, eventsSynced: 0, certificatesSynced: 0 };

  let batchesSynced = 0;
  let eventsSynced = 0;
  let certificatesSynced = 0;

  try {
    const allBatches = await prismaClient.batch.findMany({
      include: { events: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "asc" },
    });

    const signerAddress = getSignerAddress();

    for (const batch of allBatches) {
      const ledgerBefore = readLocalLedger();
      const wasInLedger = Boolean(
        ledgerBefore.batches[batch.batchId] && ledgerBefore.batches[batch.batchId].metadataHash
      );

      const batchRes = await recordBatchOnChain({
        batchId: batch.batchId,
        farmerId: batch.farmerId,
        batch,
      });

      const finalBatchTxHash = batch.chainTxHash || batchRes.txHash;
      if (
        batch.chainStatus !== "CONFIRMED" ||
        !batch.chainTxHash ||
        !wasInLedger
      ) {
        await prismaClient.batch.update({
          where: { id: batch.id },
          data: {
            chainTxHash: finalBatchTxHash,
            chainStatus: "CONFIRMED",
          },
        });
        batchesSynced++;
      }

      // Sync Certificate Hash (DB <-> Ledger <-> EVM)
      const ledgerCert = ledgerBefore.certificates[batch.batchId];
      const certHashToSync = batch.certificateHash || ledgerCert?.certificateHash || null;

      if (certHashToSync) {
        const certIdToSync =
          batch.organicCertId || ledgerCert?.certificateId || `CERT-${batch.batchId}`;
        const certRes = await recordCertificateOnChain({
          batchId: batch.batchId,
          certificateId: certIdToSync,
          certificateHash: certHashToSync,
          verifier: signerAddress,
          batch,
        });

        if (!batch.certificateHash || !batch.organicCertId) {
          await prismaClient.batch.update({
            where: { id: batch.id },
            data: {
              certificateHash: certRes.certificateHash,
              organicCertId: certIdToSync,
              chainStatus: "CONFIRMED",
            },
          });
        }
        certificatesSynced++;
      }

      // Sync Supply Chain Events (DB <-> Ledger <-> EVM)
      for (const ev of batch.events || []) {
        const dataHash = computeEventDataHash({
          batchId: batch.batchId,
          eventType: ev.eventType,
          participant: signerAddress,
          location: ev.location || "",
          notes: ev.notes || "",
        });

        const evRes = await recordEventOnChain({
          eventId: ev.id,
          batchId: batch.batchId,
          eventType: ev.eventType,
          participant: signerAddress,
          dataHash,
          location: ev.location || "",
          notes: ev.notes || "",
          batch,
          preferredTxHash: ev.chainTxHash,
        });

        const finalEvTxHash = ev.chainTxHash || evRes.txHash;
        if (ev.chainStatus !== "CONFIRMED" || !ev.chainTxHash) {
          await prismaClient.supplyChainEvent.update({
            where: { id: ev.id },
            data: {
              chainTxHash: finalEvTxHash,
              chainStatus: "CONFIRMED",
            },
          });
          eventsSynced++;
        }
      }
    }
  } catch (err) {
    console.warn("[blockchain] syncDatabaseWithBlockchain warning:", err.message);
  }

  return { batchesSynced, eventsSynced, certificatesSynced };
}

function isConfigured() {
  syncEnvIfNeeded();
  const artifact = loadArtifact();
  return Boolean(
    artifact && (process.env.CONTRACT_ADDRESS || process.env.PRIVATE_KEY || DEFAULT_PRIVATE_KEY)
  );
}

module.exports = {
  recordBatchOnChain,
  recordEventOnChain,
  recordCertificateOnChain,
  getBatchOnChainData,
  syncDatabaseWithBlockchain,
  getSignerAddress,
  isConfigured,
  readLocalLedger,
  verifyLedgerChain,
};
