/**
 * dsaEngine.js — Data Structures & Algorithms Engine for Organic Trace
 *
 * Implements production-grade, complexity-optimal algorithms:
 *   1. MinHeap / PriorityQueue: O(N log K) Top-K selection for recommendations & RAG ranking.
 *   2. PrefixTrie & InvertedIndex: O(L) prefix lookup + O(1) inverted posting list search.
 *   3. MerkleTree: O(N) tree build, O(log N) inclusion proof generation & O(log N) verification.
 *   4. SupplyChainStageDAG: Directed Acyclic Graph (DAG) with Kahn's O(V + E) topological sort
 *      and custody-transition anomaly detection.
 *   5. LruTtlCache: O(1) Hash Map + Doubly-Linked order LRU cache with TTL expiration.
 */

const crypto = require("crypto");
const { sha256Hex, normalizeHexHash, constantTimeHashEquals } = require("../hash");

/**
 * 1. Binary Min-Heap Priority Queue
 * Time Complexity:
 *   - push / pop: O(log K)
 *   - peek: O(1)
 *   - selectTopK(N items, K): O(N log K) time, O(K) auxiliary space
 */
class MinHeap {
  constructor(compareFn = (a, b) => a.score - b.score) {
    this.heap = [];
    this.compare = compareFn;
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  push(item) {
    this.heap.push(item);
    this._siftUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this._siftDown(0);
    }
    return top;
  }

  toSortedDescArray() {
    const copy = [...this.heap];
    return copy.sort((a, b) => this.compare(b, a));
  }

  _siftUp(idx) {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.compare(this.heap[idx], this.heap[parent]) < 0) {
        const tmp = this.heap[idx];
        this.heap[idx] = this.heap[parent];
        this.heap[parent] = tmp;
        idx = parent;
      } else {
        break;
      }
    }
  }

  _siftDown(idx) {
    const len = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = (idx << 1) + 1;
      const right = left + 1;

      if (left < len && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      if (right < len && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      if (smallest !== idx) {
        const tmp = this.heap[idx];
        this.heap[idx] = this.heap[smallest];
        this.heap[smallest] = tmp;
        idx = smallest;
      } else {
        break;
      }
    }
  }

  /**
   * Selects the Top-K highest-scoring items in O(N log K) time and O(K) space.
   */
  static selectTopK(items, k, scoreExtractor = (x) => x.score) {
    if (!Array.isArray(items) || items.length === 0 || k <= 0) return [];
    if (k >= items.length) {
      return [...items].sort((a, b) => scoreExtractor(b) - scoreExtractor(a));
    }
    const minHeap = new MinHeap((a, b) => scoreExtractor(a) - scoreExtractor(b));
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (minHeap.size() < k) {
        minHeap.push(item);
      } else if (scoreExtractor(item) > scoreExtractor(minHeap.peek())) {
        minHeap.heap[0] = item;
        minHeap._siftDown(0);
      }
    }
    return minHeap.toSortedDescArray();
  }
}

/**
 * 2. Prefix Trie for O(L) prefix matching & token expansion
 */
class PrefixTrieNode {
  constructor() {
    this.children = new Map();
    this.words = new Set();
  }
}

class PrefixTrie {
  constructor() {
    this.root = new PrefixTrieNode();
  }

  insert(word) {
    if (!word || typeof word !== "string") return;
    const clean = word.trim().toLowerCase();
    if (!clean) return;
    let node = this.root;
    for (const ch of clean) {
      if (!node.children.has(ch)) {
        node.children.set(ch, new PrefixTrieNode());
      }
      node = node.children.get(ch);
      if (node.words.size < 32) {
        node.words.add(clean);
      }
    }
    node.words.add(clean);
  }

  findWordsWithPrefix(prefix, maxResults = 16) {
    if (!prefix || typeof prefix !== "string") return [];
    const clean = prefix.trim().toLowerCase();
    if (!clean) return [];
    let node = this.root;
    for (const ch of clean) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch);
    }
    const out = [];
    for (const w of node.words) {
      out.push(w);
      if (out.length >= maxResults) break;
    }
    return out;
  }
}

/**
 * 3. Inverted Index with Prefix Trie for O(1) Token + O(L) Prefix Full-Text Search
 */
class InvertedIndex {
  constructor() {
    this.postings = new Map(); // token -> Map<docId, weight>
    this.docs = new Map(); // docId -> document
    this.trie = new PrefixTrie();
  }

  static tokenize(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}-]+/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2);
  }

  addDocument(docId, doc, weightedFields = []) {
    this.docs.set(docId, doc);
    for (const { text, weight = 1 } of weightedFields) {
      const tokens = InvertedIndex.tokenize(text);
      for (const token of tokens) {
        this.trie.insert(token);
        if (!this.postings.has(token)) {
          this.postings.set(token, new Map());
        }
        const docMap = this.postings.get(token);
        docMap.set(docId, (docMap.get(docId) || 0) + weight);
      }
    }
  }

  /**
   * Searches indexed documents in O(Q * P) where Q is query token count and P is posting list size.
   * Uses MinHeap for O(M log K) Top-K ranking when limit K is specified.
   */
  search(query, limit = 50) {
    const queryTokens = InvertedIndex.tokenize(query);
    if (queryTokens.length === 0) return [];

    const scores = new Map();

    for (const qToken of queryTokens) {
      // Exact token match in O(1)
      const exactPostings = this.postings.get(qToken);
      if (exactPostings) {
        for (const [docId, weight] of exactPostings.entries()) {
          scores.set(docId, (scores.get(docId) || 0) + weight * 2.0);
        }
      }

      // Prefix Trie expansion in O(L)
      if (qToken.length >= 3) {
        const prefixMatches = this.trie.findWordsWithPrefix(qToken, 12);
        for (const expanded of prefixMatches) {
          if (expanded === qToken) continue;
          const prefixPostings = this.postings.get(expanded);
          if (prefixPostings) {
            for (const [docId, weight] of prefixPostings.entries()) {
              scores.set(docId, (scores.get(docId) || 0) + weight * 1.0);
            }
          }
        }
      }
    }

    const candidates = [];
    for (const [docId, score] of scores.entries()) {
      const doc = this.docs.get(docId);
      if (doc) {
        candidates.push({ docId, doc, score });
      }
    }

    return MinHeap.selectTopK(candidates, limit, (x) => x.score);
  }
}

/**
 * 4. Binary SHA-256 Merkle Tree with O(log N) Inclusion Proof Generation & Verification
 */
class MerkleTree {
  static hashLeafBuffer(hexOrStr) {
    const norm = normalizeHexHash(String(hexOrStr || ""));
    const raw = norm.startsWith("0x") ? norm.slice(2) : norm;
    if (/^[0-9a-f]{64}$/i.test(raw)) {
      return Buffer.from(raw, "hex");
    }
    return crypto.createHash("sha256").update(String(hexOrStr || ""), "utf-8").digest();
  }

  static hashPairBuffers(leftBuf, rightBuf) {
    const combined = Buffer.concat([leftBuf, rightBuf]);
    const hex = sha256Hex(combined);
    return Buffer.from(hex.slice(2), "hex");
  }

  /**
   * Builds all levels of the Merkle Tree in O(N) time and space.
   */
  static buildLevels(leaves = []) {
    if (!Array.isArray(leaves) || leaves.length === 0) {
      const emptyRoot = Buffer.from(sha256Hex(Buffer.alloc(0)).slice(2), "hex");
      return [[emptyRoot]];
    }

    const level0 = leaves.map((l) => MerkleTree.hashLeafBuffer(l));
    const levels = [level0];
    let current = level0;

    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = i + 1 < current.length ? current[i + 1] : current[i];
        next.push(MerkleTree.hashPairBuffers(left, right));
      }
      levels.push(next);
      current = next;
    }

    return levels;
  }

  /**
   * Generates a cryptographic Merkle proof for `leafIndex` in O(log2 N) steps.
   */
  static generateProof(leaves = [], leafIndex = 0) {
    if (!Array.isArray(leaves) || leaves.length === 0 || leafIndex < 0 || leafIndex >= leaves.length) {
      return {
        valid: false,
        leafIndex,
        leaf: null,
        root: sha256Hex(Buffer.alloc(0)),
        siblings: [],
      };
    }

    const levels = MerkleTree.buildLevels(leaves);
    const siblings = [];
    let idx = leafIndex;

    for (let lvl = 0; lvl < levels.length - 1; lvl++) {
      const currentLevel = levels[lvl];
      const isRightNode = idx % 2 === 1;
      const siblingIdx = isRightNode
        ? idx - 1
        : idx + 1 < currentLevel.length
        ? idx + 1
        : idx;

      siblings.push({
        position: isRightNode ? "left" : "right",
        hash: "0x" + currentLevel[siblingIdx].toString("hex"),
      });

      idx = Math.floor(idx / 2);
    }

    const rootBuf = levels[levels.length - 1][0];
    return {
      valid: true,
      leafIndex,
      leaf: "0x" + levels[0][leafIndex].toString("hex"),
      root: "0x" + rootBuf.toString("hex"),
      siblings,
      treeDepth: levels.length - 1,
    };
  }

  /**
   * Verifies a Merkle inclusion proof in O(log2 N) time and O(1) space.
   */
  static verifyProof(leafHex, siblings = [], expectedRootHex) {
    if (!leafHex || !expectedRootHex || !Array.isArray(siblings)) return false;
    let currentBuf = MerkleTree.hashLeafBuffer(leafHex);

    for (const step of siblings) {
      if (!step || !step.hash) return false;
      const siblingBuf = MerkleTree.hashLeafBuffer(step.hash);
      if (step.position === "left") {
        currentBuf = MerkleTree.hashPairBuffers(siblingBuf, currentBuf);
      } else {
        currentBuf = MerkleTree.hashPairBuffers(currentBuf, siblingBuf);
      }
    }

    const computedRoot = "0x" + currentBuf.toString("hex");
    return constantTimeHashEquals(computedRoot, normalizeHexHash(expectedRootHex));
  }
}

/**
 * 5. Supply Chain Stage Directed Acyclic Graph (DAG) & Topological Analyzer
 */
const SUPPLY_CHAIN_STAGES = [
  { id: "BATCH_CREATED", rank: 0, phase: "FARM_ORIGIN" },
  { id: "HARVESTED", rank: 1, phase: "FARM_ORIGIN" },
  { id: "CERTIFICATE_UPLOADED", rank: 1, phase: "CERTIFICATION" },
  { id: "QUALITY_CHECK_PASSED", rank: 2, phase: "QUALITY_ASSURANCE" },
  { id: "RECEIVED_BY_PROCESSOR", rank: 2, phase: "PROCESSING" },
  { id: "PROCESSING_STARTED", rank: 3, phase: "PROCESSING" },
  { id: "PROCESSING_COMPLETED", rank: 4, phase: "PROCESSING" },
  { id: "PACKAGED", rank: 5, phase: "PACKAGING" },
  { id: "COLD_STORAGE_LOGGED", rank: 5, phase: "STORAGE" },
  { id: "RECEIVED_BY_DISTRIBUTOR", rank: 6, phase: "LOGISTICS" },
  { id: "DISPATCHED", rank: 7, phase: "LOGISTICS" },
  { id: "IN_TRANSIT", rank: 8, phase: "LOGISTICS" },
  { id: "DELIVERED_TO_RETAILER", rank: 9, phase: "RETAIL" },
  { id: "RECEIVED_BY_RETAILER", rank: 9, phase: "RETAIL" },
  { id: "AVAILABLE_FOR_SALE", rank: 10, phase: "RETAIL" },
];

const STAGE_MAP = new Map(SUPPLY_CHAIN_STAGES.map((s) => [s.id, s]));

const STAGE_ADJACENCY = new Map([
  ["BATCH_CREATED", ["HARVESTED", "CERTIFICATE_UPLOADED", "QUALITY_CHECK_PASSED", "RECEIVED_BY_PROCESSOR", "PACKAGED", "DISPATCHED"]],
  ["HARVESTED", ["CERTIFICATE_UPLOADED", "QUALITY_CHECK_PASSED", "RECEIVED_BY_PROCESSOR"]],
  ["CERTIFICATE_UPLOADED", ["QUALITY_CHECK_PASSED", "RECEIVED_BY_PROCESSOR", "PROCESSING_STARTED"]],
  ["QUALITY_CHECK_PASSED", ["RECEIVED_BY_PROCESSOR", "PROCESSING_STARTED", "PACKAGED", "DISPATCHED"]],
  ["RECEIVED_BY_PROCESSOR", ["PROCESSING_STARTED", "PROCESSING_COMPLETED", "PACKAGED"]],
  ["PROCESSING_STARTED", ["PROCESSING_COMPLETED", "PACKAGED"]],
  ["PROCESSING_COMPLETED", ["PACKAGED", "COLD_STORAGE_LOGGED", "RECEIVED_BY_DISTRIBUTOR", "DISPATCHED"]],
  ["PACKAGED", ["COLD_STORAGE_LOGGED", "RECEIVED_BY_DISTRIBUTOR", "DISPATCHED", "IN_TRANSIT"]],
  ["COLD_STORAGE_LOGGED", ["RECEIVED_BY_DISTRIBUTOR", "DISPATCHED", "IN_TRANSIT"]],
  ["RECEIVED_BY_DISTRIBUTOR", ["DISPATCHED", "IN_TRANSIT", "DELIVERED_TO_RETAILER"]],
  ["DISPATCHED", ["IN_TRANSIT", "DELIVERED_TO_RETAILER", "RECEIVED_BY_RETAILER"]],
  ["IN_TRANSIT", ["DELIVERED_TO_RETAILER", "RECEIVED_BY_RETAILER", "AVAILABLE_FOR_SALE"]],
  ["DELIVERED_TO_RETAILER", ["RECEIVED_BY_RETAILER", "AVAILABLE_FOR_SALE"]],
  ["RECEIVED_BY_RETAILER", ["AVAILABLE_FOR_SALE"]],
  ["AVAILABLE_FOR_SALE", []],
]);

class SupplyChainStageDAG {
  /**
   * Computes topological sort of the supply chain stage DAG using Kahn's Algorithm in O(V + E).
   */
  static topologicalSort() {
    const inDegree = new Map();
    for (const [node] of STAGE_ADJACENCY.entries()) {
      inDegree.set(node, 0);
    }
    for (const [, neighbors] of STAGE_ADJACENCY.entries()) {
      for (const next of neighbors) {
        inDegree.set(next, (inDegree.get(next) || 0) + 1);
      }
    }

    const queue = [];
    let head = 0;
    for (const [node, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(node);
    }

    const order = [];
    while (head < queue.length) {
      const curr = queue[head++];
      order.push(curr);
      for (const next of STAGE_ADJACENCY.get(curr) || []) {
        const nextDeg = inDegree.get(next) - 1;
        inDegree.set(next, nextDeg);
        if (nextDeg === 0) {
          queue.push(next);
        }
      }
    }

    return {
      order,
      isDAG: order.length === STAGE_ADJACENCY.size,
      vertexCount: STAGE_ADJACENCY.size,
    };
  }

  /**
   * Evaluates an ordered list of supply chain events against the canonical DAG in O(E) time.
   */
  static analyzeEventSequence(events = [], hasCertificate = false) {
    const stagesVisited = ["BATCH_CREATED"];
    if (hasCertificate) stagesVisited.push("CERTIFICATE_UPLOADED");

    const anomalies = [];
    let maxRank = hasCertificate ? 1 : 0;
    let prevRank = 0;

    for (let i = 0; i < events.length; i++) {
      const evType = String(events[i]?.eventType || "").trim().toUpperCase();
      stagesVisited.push(evType);
      const stageMeta = STAGE_MAP.get(evType);
      if (stageMeta) {
        if (stageMeta.rank < prevRank && evType !== "QUALITY_CHECK_PASSED" && evType !== "COLD_STORAGE_LOGGED") {
          anomalies.push({
            index: i,
            fromRank: prevRank,
            toRank: stageMeta.rank,
            eventType: evType,
            reason: "Stage rank regression detected in supply chain sequence",
          });
        }
        prevRank = Math.max(prevRank, stageMeta.rank);
        maxRank = Math.max(maxRank, stageMeta.rank);
      }
    }

    const completionPercent = Math.min(100, Math.round(((maxRank + 1) / 11) * 100));
    const currentStage = stagesVisited[stagesVisited.length - 1] || "BATCH_CREATED";
    const currentPhase = STAGE_MAP.get(currentStage)?.phase || "CUSTOM_STAGE";

    return {
      validProgression: anomalies.length === 0,
      currentStage,
      currentPhase,
      completionPercent,
      stagesVisited,
      anomalies,
    };
  }
}

/**
 * 6. O(1) Hash Map + Doubly-Linked Order LRU Cache with TTL
 */
class LruTtlCache {
  constructor(maxEntries = 1024) {
    this.maxEntries = maxEntries;
    this.map = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() >= entry.expiresAt) {
      this.map.delete(key);
      this.misses++;
      return null;
    }
    // Refresh LRU order in O(1)
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key, value, ttlMs = 30000) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
    this.map.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs > 0 ? ttlMs : 30000),
    });
  }

  invalidatePrefix(prefix) {
    let removed = 0;
    for (const k of this.map.keys()) {
      if (String(k).startsWith(prefix)) {
        this.map.delete(k);
        removed++;
      }
    }
    return removed;
  }

  clear() {
    this.map.clear();
  }

  stats() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.map.size,
      maxEntries: this.maxEntries,
    };
  }
}

module.exports = {
  MinHeap,
  PrefixTrie,
  InvertedIndex,
  MerkleTree,
  SupplyChainStageDAG,
  LruTtlCache,
  SUPPLY_CHAIN_STAGES,
};
