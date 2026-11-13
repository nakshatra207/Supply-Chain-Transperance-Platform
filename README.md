# Organic Trace — Blockchain Supply Chain Transparency & Indian Government Schemes Platform

An end-to-end **Blockchain-Based Organic Farming Supply Chain Traceability, Indian Government Schemes Discovery, Multilingual Voice Navigation & Ollama AI Assistant Platform**, accelerated by a custom **Native C11 + C++20 + x86_64 SIMD Assembly (and ARM64 portable)** engine.

---

## 1. Key Capabilities

1. **Blockchain Product Batch & Custody Traceability (`SupplyChain.sol`)**:
   - Farmers register organic crop batches (`/farmer/batches/new`), anchor canonical **SHA-256 metadata hashes** on an Ethereum/Hardhat smart contract (`SupplyChain.sol`) and local cryptographic hash-chain ledger (`localChainLedger.json`), and upload PGS-India / NPOP organic certificates.
   - Supply Chain Partners (Processors, Distributors, Retailers) log custody events (`RECEIVED_BY_PROCESSOR`, `PACKAGED`, `DISPATCHED`, `IN_TRANSIT`, `AVAILABLE_FOR_SALE`) with tamper-evident hashes.
   - Public QR Code Consumer Verification (`/trace/:batchId`) recomputes database hashes, verifies **Binary SHA-256 Merkle Tree Inclusion Proofs ($O(\log_2 N)$)**, validates custody progression via a **Directed Acyclic Graph (DAG)**, and alerts immediately if any database field was tampered with.
2. **Native C11 + C++20 + x86_64 SIMD Assembly Accelerator (`backend/src/native/`)**:
   - **C11 SHA-NI Hardware SHA-256 & Zero-Copy Base64 Streaming (`sha256_engine.c`)**: Streams up to 5MB Base64 certificates in 4KB stack chunks directly into hardware SHA-NI (`~1,490 MB/s` throughput, zero intermediate heap allocations).
   - **x86_64 Assembly (`fast_asm.S`) + Portable C11 ARM64 Fallback**: Vectorized SSSE3 `pshufb` hex encoding (`asm_bytes32_to_hex_0x`), branchless constant-time comparison (`asm_const_time_eq`), hardware SSE4.2 `crc32q` (`asm_crc32c_buffer`), 128-bit XMM XOR fold (`asm_simd_xor32`), and SIMD `pmaddwd` 16-bit vector dot product (`asm_simd_dot_i16`, `>10,000 MOps/s`).
   - **C++20 Off-Heap Thread-Safe LRU + TTL Cache (`addon.cpp`)**: Uses `std::shared_mutex`, `std::unordered_map`, and `std::list` for $O(1)$ sub-microsecond response caching outside the V8 garbage collector.
3. **Data Structures & Algorithms Engine (`backend/src/utils/dsaEngine.js`)**:
   - **Binary Min-Heap Priority Queue (`MinHeap`)**: $O(N \log K)$ Top-$K$ selection for scheme recommendations and RAG context ranking.
   - **Inverted Index + Prefix Trie (`InvertedIndex`, `PrefixTrie`)**: $O(1)$ token lookup and $O(L)$ prefix autocomplete across bilingual (English & Hindi) scheme records.
   - **Cryptographic Merkle Tree (`MerkleTree`)**: $O(N)$ tree construction and $O(\log_2 N)$ inclusion proof generation & verification.
   - **Supply Chain Stage DAG (`SupplyChainStageDAG`)**: Kahn's $O(V + E)$ topological sort and $O(E)$ custody-progression anomaly detector.
4. **Verified Indian Government Schemes Hub (`/schemes`)**:
   - 17+ curated Central and State Government agricultural schemes (PKVY, PM-KISAN, PMKSY, AIF, PMFBY, e-NAM, FPO-10K, NPOP-APEDA, AMI-NABARD, SMAM, Haryana & Punjab Organic Missions, MOVCDNER) with `.gov.in` / `.nic.in` SSRF-safe domain validation.
5. **27-Language Indian Localization, Voice Assistant & Ollama AI Assistant (`/assistant`)**:
   - Full UI localization across 27 Indian languages, Web Speech API voice commands (`🎙️ Voice`) + Text-to-Speech (`🔊 Read Aloud`), and a locally hosted Ollama assistant grounded with app and scheme context.

---

## 2. Architecture & Folder Structure

```text
Supply-Chain-Transperance-Platform-main/
├── Makefile                        # Multi-arch (x86_64 ASM & ARM64) native C11/C++20 build
├── Dockerfile                      # Multi-stage non-root container build (AMD64 & ARM64)
├── docker-compose.yml              # Full stack (PostgreSQL, Hardhat EVM, Backend, Frontend)
├── .dockerignore                   # Container context exclusions
├── .env.example                    # Sanitized environment variable template
├── start.sh / stop.sh / run.py     # High-speed cross-platform launchers
├── scripts/                        # Cross-platform Bash (.sh) & PowerShell (.ps1) scripts
│   ├── build.sh / build.ps1
│   ├── run.sh   / run.ps1
│   ├── stop.sh  / stop.ps1
│   └── test.sh  / test.ps1
├── .github/workflows/ci.yml        # Automated CI/CD pipeline (Tests + Multi-Arch Docker Buildx)
├── native/
│   └── fast_launcher.cpp           # C++20 non-blocking socket prober & benchmark CLI
├── contracts/                      # Solidity Smart Contracts (Hardhat)
│   ├── contracts/SupplyChain.sol
│   └── test/SupplyChain.test.js
├── backend/                        # Express + Prisma + Native N-API Addon + DSA Engine
│   ├── prisma/schema.prisma        # Indexed PostgreSQL schema
│   └── src/
│       ├── native/                 # C11 SHA-NI, x86_64 ASM (fast_asm.S), C++20 N-API (addon.cpp)
│       ├── utils/dsaEngine.js      # MinHeap, PrefixTrie, InvertedIndex, MerkleTree, StageDAG, LRU
│       ├── middleware/auth.js      # Hardened JWT signature verification & RBAC middleware
│       ├── routes/                 # auth, batches, events, trace, schemes, preferences, assistant
│       └── services/               # schemeSyncService.js, llmAssistantService.js
└── frontend/                       # React 18 + Vite 5 + Tailwind CSS (Code-Split Lazy Routes)
```

---

## 3. Port & Environment Configuration

| Service | Default Port | Environment Variable | Description |
| :--- | :---: | :--- | :--- |
| **PostgreSQL 16** | `5432` | `DATABASE_URL`, `POSTGRES_PORT` | Primary relational database |
| **Hardhat EVM RPC** | `8545` | `BLOCKCHAIN_RPC_URL`, `HARDHAT_PORT` | Local Ethereum JSON-RPC node (Chain ID `31337`) |
| **Backend REST API** | `5000` | `PORT`, `BACKEND_PORT` | Express API + Native C11/C++20/ASM N-API addon |
| **Frontend Web UI** | `5173` | `FRONTEND_PORT`, `VITE_API_URL` | React + Vite Web Application |
| **Ollama** | `11435` | `OLLAMA_BASE_URL`, `OLLAMA_PORT`, `OLLAMA_MODEL` | App-managed local AI inference for assistant queries |

Copy `.env.example` to `.env` before deployment:
```bash
cp .env.example .env
```

### Ollama Assistant Setup

The assistant uses Ollama only. `./start.sh` starts an isolated Ollama service on port `11435`, downloads the configured model on first run, and stores native Ollama model files under `.ollama/models/` in this project. The model files are ignored by Git and Docker build contexts; expect roughly 2 GB of disk space for `llama3.2:latest`.

For manual/native setup, install Ollama and use the same app-local model directory and port:
```bash
mkdir -p .ollama/models
OLLAMA_MODELS="$PWD/.ollama/models" OLLAMA_HOST=127.0.0.1:11435 ollama serve
# In a second terminal:
OLLAMA_MODELS="$PWD/.ollama/models" OLLAMA_HOST=127.0.0.1:11435 ollama pull llama3.2:latest
```
Set `OLLAMA_BASE_URL` and `OLLAMA_MODEL` in `.env` to change the endpoint or model. The Docker Compose Ollama service uses the app-specific persistent `organic_trace_ollama` volume (host port `11435` by default). The startup script pulls the selected model automatically for either native or Compose-managed Ollama.

To run the complete Docker Compose stack:
```bash
docker compose up -d --build
```
Set `OLLAMA_MODEL` in `.env` to select another model. Assistant queries return a visible error if Ollama is unreachable; they are not silently answered by another provider.

---

## 4. Quick Start (Minimal Commands)

### Option A: Native High-Speed Execution (Linux & macOS)
```bash
./scripts/build.sh
./scripts/run.sh
```
Stop all services cleanly:
```bash
./scripts/stop.sh
```

### Option B: Containerized Docker Compose Stack (All Platforms)
```bash
./scripts/run.sh --docker
# Or directly:
docker compose up -d --build
```
Stop containers:
```bash
./scripts/stop.sh --docker
```

### Option C: Run Automated Tests & Native Benchmarks
```bash
./scripts/test.sh
```

---

## 5. Cross-Platform Deployment Guide

### 5.1 Windows 10 & Windows 11 (x86_64 / ARM64)
- **Prerequisites**: Docker Desktop for Windows (with WSL 2 backend) or Node.js 20+ & Python 3.10+.
- **PowerShell Containerized Workflow**:
  ```powershell
  .\scripts\build.ps1 -Docker
  .\scripts\run.ps1 -Docker
  .\scripts\test.ps1
  .\scripts\stop.ps1 -Docker
  ```
- **PowerShell Native Workflow**:
  ```powershell
  .\scripts\build.ps1
  .\scripts\run.ps1
  ```

### 5.2 macOS (Intel `x86_64` & Apple Silicon `M1/M2/M3/M4 arm64`)
- **Prerequisites**: Xcode Command Line Tools (`xcode-select --install`), Node.js 20+, Docker Desktop or OrbStack.
- The `Makefile` automatically detects `Darwin` (`-undefined dynamic_lookup`) and CPU architecture (`x86_64` uses GAS SIMD assembly; `arm64` compiles portable C11/C++20 fallbacks automatically).
- **Commands**:
  ```bash
  ./scripts/build.sh
  ./scripts/run.sh
  ```

### 5.3 Linux Distributions

#### Debian & Ubuntu (`apt`)
```bash
sudo apt-get update && sudo apt-get install -y build-essential gcc g++ make python3 nodejs npm docker.io docker-compose-v2
./scripts/build.sh && ./scripts/run.sh
```

#### Fedora / RHEL (`dnf`)
```bash
sudo dnf install -y gcc gcc-c++ make python3 nodejs npm moby-engine docker-compose
./scripts/build.sh && ./scripts/run.sh
```

#### Arch Linux (`pacman`)
```bash
sudo pacman -S --needed base-devel gcc make python nodejs npm docker docker-compose
./scripts/build.sh && ./scripts/run.sh
```

### 5.4 FreeBSD (13.x / 14.x)
> **Important Note on FreeBSD Containerization**: Docker Engine relies on Linux kernel namespaces (`cgroups`, `overlayfs`) and is not natively supported on the FreeBSD kernel in the same way as on Linux. Use one of the three supported FreeBSD workflows below:

1. **Native FreeBSD Execution (Recommended for Lowest Overhead)**:
   ```sh
   sudo pkg install -y node20 npm-node20 gcc gmake python3 postgresql16-server
   sudo sysrc postgresql_enable="YES" && sudo service postgresql initdb && sudo service postgresql start
   gmake clean && gmake all
   ./scripts/run.sh
   ```
2. **Podman on FreeBSD (OCI Container Runtime)**:
   ```sh
   sudo pkg install -y podman podman-compose
   sudo sysrc podman_enable="YES"
   ./scripts/run.sh --docker
   ```
3. **Linux VM on FreeBSD (`bhyve` / `vm-bhyve`)**:
   - Provision a lightweight Debian/Alpine Linux guest under `bhyve` and run `docker compose up -d --build` inside the VM.

### 5.5 Multi-Platform Docker Buildx (`linux/amd64` & `linux/arm64`)
```bash
docker buildx create --use --name organic-multiarch || true
docker buildx build --platform linux/amd64,linux/arm64 -t organic-trace:multiarch .
```

---

## 6. Seeded Demo Accounts

Password for all demo accounts: **`Demo@1234`**
- **Farmer**: `farmer@example.com` (Ramesh Kumar — manages `ORG-BAS-001` Organic Basmati Rice)
- **Supply Chain Partner**: `partner@example.com` (Suresh Traders)
- **Platform Admin**: `admin@example.com`
