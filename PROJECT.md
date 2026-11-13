# Academic Project Report: Design and Implementation of a Blockchain-Based Organic Supply Chain Transparency and Government Scheme Discovery Platform

---

## PART A: FRONT MATTER INFORMATION

### Academic Title
**Design and Implementation of an End-to-End Blockchain-Based Organic Agricultural Supply Chain Traceability, Government Schemes Discovery, Multilingual Voice Navigation, and Hardware-Accelerated Verification Platform**

---

### Abstract
Adulteration, fraudulent certification, and lack of transparency in agricultural supply chains severely undermine consumer trust and prevent organic farmers from commanding fair market premiums. Concurrently, small and marginal farmers across India face systemic linguistic and digital literacy barriers that hinder their ability to discover, evaluate, and access government welfare schemes. This project presents **Organic Trace**, an end-to-end, privacy-preserving, and computationally accelerated platform that bridges decentralized supply chain transparency with agricultural welfare intelligence. 

The core traceability subsystem records farm-origin batches, PGS-India/NPOP organic certification hashes, and subsequent supply chain custody events on a local Ethereum-compatible smart contract (`SupplyChain.sol`) deployed via Hardhat, backed by an autonomous local cryptographic hash-chain ledger. A zero-knowledge-inspired hashing paradigm is enforced: only canonical SHA-256 metadata digests and cryptographic Merkle tree roots ($O(\log_2 N)$ inclusion proofs) are anchored on-chain, eliminating the on-chain storage of sensitive personal data or raw documents. Custody transitions are validated against a 15-stage Directed Acyclic Graph (DAG) using Kahn’s topological sort algorithm ($O(V + E)$) to detect supply chain sequence regressions and physical custody anomalies. 

To overcome severe performance overheads associated with high-throughput cryptographic verification in interpreted JavaScript runtimes, a low-level Native C11 + C++20 + x86_64 SIMD Assembly accelerator engine (`organic_native.node`) is engineered. The native engine implements hardware Intel/AMD SHA-NI instructions, zero-copy 4KB stack-chunked Base64 streaming (~1,490 MB/s), SSSE3 vectorized `pshufb` hex encoding, SSE4.2 `crc32q` checksumming, SIMD `pmaddwd` 16-bit vector dot-products (>10,000 MOps/s), branchless constant-time hash comparisons (`asm_const_time_eq`), and an off-heap thread-safe C++20 LRU cache with `std::shared_mutex`. 

Furthermore, the platform integrates a curated Indian Government Schemes Discovery Hub containing 17+ verified Central and State programs, secured by strict `.gov.in`/`.nic.in` Server-Side Request Forgery (SSRF) validation. Discovery is powered by a custom Data Structures and Algorithms (DSA) engine featuring an Inverted Index, Prefix Trie, and Binary Min-Heap Priority Queue ($O(N \log K)$ Top-$K$ selection). The user experience is unified across 27 Indian regional languages, featuring Web Speech API voice-driven navigation with injection-hardened natural language parsing and an optional local Ollama LLM assistant. Automated unit, integration, security audit, and concurrency benchmark test suites confirm zero-regression execution, tamper resistance, and sub-millisecond query latency.

**Keywords**: Blockchain Traceability, Ethereum Smart Contracts, Merkle Tree Proofs, Hardware SHA-NI Acceleration, SIMD Assembly, Directed Acyclic Graph (DAG), Indian Government Schemes, Voice Navigation.

---

### List of Tables

| Table Number | Table Caption |
| :--- | :--- |
| Table 1.1 | Key Project Modules and Capability Overview |
| Table 2.1 | Comparative Feature Analysis: Existing Supply Chain & Agri-Portals vs. Organic Trace |
| Table 3.1 | Functional Requirements Specifications (FRS) Matrix |
| Table 3.2 | Non-Functional Requirements (NFR) Specifications |
| Table 3.3 | Hardware Minimum and Recommended Environment Specifications |
| Table 3.4 | Complete Software Technology Stack, Libraries, and Semantic Versions |
| Table 3.5 | System Actors, Roles, and Permission Matrix |
| Table 4.1 | PostgreSQL Relational Database Schema and Constraints (`schema.prisma`) |
| Table 4.2 | Project Directory Layout and Architectural File Mapping |
| Table 4.3 | Supply Chain Stage Hierarchy, Phases, and Rank Assignments |
| Table 4.4 | RESTful and RPC API Endpoint Specification |
| Table 4.5 | Supported Indian Regional Languages and BCP-47 Voice Codes |
| Table 5.1 | Automated Test Suite Organization and Coverage Summary |
| Table 5.2 | Comprehensive System Test Cases (Unit, Integration, Security, and Edge Cases) |
| Table 5.3 | Software Defects Identified, Root Cause Analyses, and Architectural Fixes |
| Table 6.1 | Cryptographic Accelerator Throughput and Execution Latency Benchmarks |
| Table 6.2 | Data Structure Algorithmic Complexity and Empirical Comparison |

---

### List of Figures and Diagrams

| Figure Number | Figure Caption |
| :--- | :--- |
| Figure 4.1 | High-Level System Architecture and Multi-Tier Component Interaction Diagram |
| Figure 4.2 | Level 0 Context Data Flow Diagram (DFD) |
| Figure 4.3 | Level 1 Detailed Functional Data Flow Diagram (DFD) |
| Figure 4.4 | System Use Case Diagram Across All User Roles |
| Figure 4.5 | Domain Class Diagram of Backend Engine and Smart Contracts |
| Figure 4.6 | Sequence Diagram: Batch Creation, SHA-NI Hashing, and Blockchain Anchoring |
| Figure 4.7 | Sequence Diagram: Public Consumer QR Code Trace and Merkle Verification |
| Figure 4.8 | Entity-Relationship (ER) Diagram of the Relational Database |
| Figure 4.9 | Supply Chain Custody Progression Directed Acyclic Graph (DAG) |
| Figure 4.10 | Binary Merkle Tree Cryptographic Hash-Tree Inclusion Proof Architecture |

---

### List of Symbols and Abbreviations

- **ABI**: Application Binary Interface
- **AIF**: Agriculture Infrastructure Fund
- **API**: Application Programming Interface
- **APEDA**: Agricultural and Processed Food Products Export Development Authority
- **ASIC**: Application-Specific Integrated Circuit
- **ASM**: Assembly Language (x86_64 GNU Assembler / GAS)
- **AVX**: Advanced Vector Extensions
- **BOLA**: Broken Object Level Authorization
- **CA**: Certificate Authority
- **C11**: ISO/IEC 9899:2011 C Programming Language Standard
- **C++20**: ISO/IEC 14882:2020 C++ Programming Language Standard
- **CI/CD**: Continuous Integration / Continuous Deployment
- **CRC**: Cyclic Redundancy Check
- **CORS**: Cross-Origin Resource Sharing
- **DAG**: Directed Acyclic Graph
- **DFD**: Data Flow Diagram
- **DSA**: Data Structures and Algorithms
- **EDR**: Ethereum Development Runtime (Hardhat / Nomic Foundation)
- **ELF**: Executable and Linkable Format
- **e-NAM**: National Agriculture Market
- **EVM**: Ethereum Virtual Machine
- **FPO**: Farmer Producer Organization
- **FRS**: Functional Requirement Specification
- **GAS**: GNU Assembler Syntax
- **IDOR**: Insecure Direct Object Reference
- **JSON**: JavaScript Object Notation
- **JWT**: JSON Web Token
- **LLM**: Large Language Model
- **LRU**: Least Recently Used (Cache Eviction Policy)
- **MSVC**: Microsoft Visual C++
- **N-API**: Node.js Application Binary Interface (node_api.h)
- **NFR**: Non-Functional Requirement
- **NPOP**: National Programme for Organic Production
- **ORM**: Object-Relational Mapping (Prisma)
- **PGS-India**: Participatory Guarantee System for India
- **PKVY**: Paramparagat Krishi Vikas Yojana
- **PM-KISAN**: Pradhan Mantri Kisan Samman Nidhi
- **PMKSY**: Pradhan Mantri Krishi Sinchayee Yojana
- **QoS**: Quality of Service
- **RAG**: Retrieval-Augmented Generation
- **RBAC**: Role-Based Access Control
- **REST**: Representational State Transfer
- **RPC**: Remote Procedure Call
- **SHA**: Secure Hash Algorithm
- **SHA-NI**: Intel/AMD Secure Hash Algorithm New Instructions
- **SIMD**: Single Instruction, Multiple Data
- **SMAM**: Sub-Mission on Agricultural Mechanization
- **SSRE**: Server-Side Request Forgery
- **SSSE3**: Supplemental Streaming SIMD Extensions 3
- **SSE4.2**: Streaming SIMD Extensions 4.2
- **TLS**: Transport Layer Security
- **Trie**: Retrieval Tree (Digital Prefix Tree)
- **TTL**: Time To Live
- **TTS**: Text-to-Speech
- **UI/UX**: User Interface / User Experience
- **UML**: Unified Modeling Language
- **URI/URL**: Uniform Resource Identifier / Uniform Resource Locator
- **V8**: Google Open-Source High-Performance JavaScript and WebAssembly Engine
- **Vite**: Modern Frontend Tooling & ES Module Bundler
- **WSL**: Windows Subsystem for Linux
- **XMM**: 128-bit SIMD Registers in x86_64 Architecture
- **XSS**: Cross-Site Scripting

---

## PART B: CHAPTER-WISE CONTENT

---

# CHAPTER 1: INTRODUCTION

### 1.1 Background and Overview of the Project
Organic agriculture has witnessed explosive global demand as consumers seek chemical-free, environmentally sustainable food products. However, the organic food sector suffers from an acute crisis of credibility. Because organic commodities (such as Basmati rice, pulses, and turmeric) physically appear identical to their conventionally cultivated counterparts, unscrupulous intermediaries frequently mislabel chemically farmed produce as "certified organic" to capture premium margins. Traditional paper-based certification documentation—issued under schemes such as PGS-India (Participatory Guarantee System) or NPOP (National Programme for Organic Production)—is prone to physical counterfeiting, unauthorized reuse across multiple product batches, and post-issuance tampering.

To establish authentic provenance, modern digital supply chains require cryptographic immutability, decentralized custody tracking, and instant public consumer verification. **Organic Trace** is an enterprise-grade platform that unifies smart-contract-anchored supply chain traceability with an Indian Government Agricultural Schemes discovery hub. Developed using a robust, multi-tier software architecture, the platform integrates:
1. **A Solidity Smart Contract (`SupplyChain.sol`)** executed on a local Hardhat Ethereum node, creating an immutable ledger of crop batches, organic certificate hashes, and supply chain transition events.
2. **An Autonomous Cryptographic Hash-Chain Ledger (`localChainLedger.json`)** that provides deterministic cryptographic integrity, cross-validating on-chain transaction data with off-chain records.
3. **A Low-Level Native C11 + C++20 + x86_64 SIMD Assembly Engine (`backend/src/native/`)** that offloads compute-heavy cryptographic hashing and cache lookups from the V8 garbage collector into hardware instruction sets (SHA-NI, SSSE3 `pshufb`, SSE4.2 `crc32q`, and SIMD `pmaddwd`).
4. **An Advanced Data Structures and Algorithms (DSA) Engine (`dsaEngine.js`)** providing Merkle tree proof generation, Kahn's algorithm topological sorting for supply chain DAG validation, and Inverted Index / Prefix Trie scheme search.
5. **A 27-Language Regional Localization and Voice Navigation Subsystem** designed to eliminate technological and literacy barriers for rural Indian agriculturalists.

```text
Table 1.1: Key Project Modules and Capability Overview
+-----------------------+-----------------------------------------------------------+----------------------------------------------+
| Subsystem             | Implementation Layer                                      | Primary Capabilities                         |
+-----------------------+-----------------------------------------------------------+----------------------------------------------+
| Blockchain Anchor     | Solidity 0.8.24 + Hardhat EVM (Chain ID 31337)            | Tamper-evident batch & hash registry         |
| Native Accelerator    | C11 + C++20 + x86_64 GAS SIMD Assembly (N-API Addon)      | Hardware SHA-NI, SSSE3 hex, off-heap cache   |
| Relational Storage    | PostgreSQL 16 + Prisma ORM (8 Models)                     | Structured entities, relations & indexes     |
| Algorithms Engine     | JavaScript / C11 Hybrid (DSA Engine)                      | Merkle Trees, MinHeap Top-K, Stage DAG       |
| Government Schemes    | Express.js + Verified Dataset (17+ Programs)              | SSRF-safe portal validation & ranking        |
| Localization & Voice  | Web Speech API + 27 Regional Locales + React 18 / Vite    | Hands-free voice commands & full native text |
| AI Assistant          | Ollama (Llama 3.2:latest) + Compact Context Retrieval    | Streaming natural language query resolution  |
+-----------------------+-----------------------------------------------------------+----------------------------------------------+
```

### 1.2 Objectives
The primary academic and engineering objectives of this project are:
1. **Decentralized Provable Traceability**: Develop a smart contract that registers product batches and appends custodial events (e.g., `HARVESTED`, `RECEIVED_BY_PROCESSOR`, `PACKAGED`, `DISPATCHED`, `IN_TRANSIT`, `AVAILABLE_FOR_SALE`) with cryptographic timestamping.
2. **Zero-Knowledge Data Integrity**: Ensure that sensitive farm documents and farmer credentials are never stored on-chain; only canonical 32-byte SHA-256 metadata digests and binary Merkle root digests ($O(\log_2 N)$) are anchored.
3. **Hardware-Accelerated Execution**: Engineer a native C11/C++20 N-API addon utilizing x86_64 assembly (SSSE3, SSE4.2, SHA-NI) to process 5MB base64 certificate streams in 4KB stack chunks, eliminating intermediate heap allocations and boosting cryptographic throughput beyond 1,400 MB/s.
4. **Graph-Based Custody Validation**: Implement a Directed Acyclic Graph (DAG) with Kahn's topological sort algorithm to analyze event sequences and detect custodial rank regressions or illicit stage skips.
5. **Farmer Empowerment through Scheme Discovery**: Curate 17+ verified Central and State agricultural programs (PKVY, PM-KISAN, AIF, etc.) with strict SSRF-safe URL validation, personalized ranking via Priority Queues (Min-Heap Top-$K$), and bilingual Hindi/English accessibility.
6. **Universal Multilingual Accessibility**: Provide complete UI localization across 27 Indian languages with client-side Web Speech voice navigation resilient against prompt and script injections.

### 1.3 Motivation and Need for the Project
In conventional agricultural marketing, smallholder organic farmers bear the financial and regulatory burdens of organic cultivation but frequently receive the same baseline commodity prices as non-organic producers because wholesale buyers doubt their claims. Conversely, health-conscious retail consumers pay 50% to 150% price premiums for organic labels without any verifiable proof of authenticity. Centralized databases maintained by private certification vendors are vulnerable to SQL injections, insider database alterations, and single-point-of-failure downtimes.

Furthermore, the Indian agricultural ecosystem features dozens of state and central support schemes providing subsidies for drip irrigation, organic bio-fertilizers, solar pumps, cold storage units, and FPO formation. Tragically, small and marginal farmers rarely utilize these funds due to fragmented web portals, complex bureaucratic jargon, and digital language barriers. There is an urgent need for a unified platform that combines tamper-evident cryptographic provenance with direct, voice-navigated access to agricultural schemes.

### 1.4 Scope of the Project
- **In Scope**:
  - Smart contract development, deployment, and testing on an EVM-compatible node.
  - Relational persistence with PostgreSQL and Prisma ORM.
  - High-performance native cryptographic compilation (C11, C++20, x86_64 Assembly).
  - Algorithmic verification: Merkle tree generation/verification, DAG topological sequence checking, and MinHeap ranking.
  - Curated Indian government schemes repository with domain-safe compliance verification.
  - Public QR-code consumer traceability page requiring zero authentication or app installation.
  - Multilingual voice parsing supporting 27 Indian regional dialects.
  - Cross-platform orchestration via Docker Compose and unified Python launcher (`run.py`).
- **Out of Scope**:
  - Live Ethereum Mainnet gas settlement (the project targets local Hardhat / Layer-2 rollups to avoid prohibitive transaction fees).
  - Physical IoT hardware sensor manufacturing (e.g., temperature/humidity probes; data payload fields are supported in software).
  - End-to-end payment gateway processing for retail consumer transactions.

### 1.5 Target Users and Real-World Applications
1. **Organic Farmers**: Smallholders and commercial organic growers who register crop batches, anchor metadata, upload PGS-India/NPOP certificate hashes, and link batches to government financial grants.
2. **Supply Chain Partners**: Food processors, testing laboratories, cold-storage operators, distributors, and retailers who log timestamped custody transitions.
3. **Retail Consumers**: End-users who scan on-package QR codes using any mobile smartphone camera to instantly view the verifiable lifecycle, DAG progression, and cryptographic Merkle proof of the food they consume.
4. **Agricultural Extension Officers & Administrators**: Government and FPO officials monitoring scheme utilization, organic compliance metrics, and supply chain throughput.

### 1.6 Organization of the Report
This report is organized into nine chapters:
- **Chapter 1** presents the project overview, objectives, motivation, scope, and target users.
- **Chapter 2** reviews relevant literature, compares existing systems, and details theoretical concepts.
- **Chapter 3** defines the problem, functional and non-functional requirements, software/hardware prerequisites, and feasibility.
- **Chapter 4** describes the architectural design, UML/DFD diagrams, database schema, algorithmic implementations, and security design.
- **Chapter 5** details the verification strategy, automated test suites, resolved defects, and deployment instructions.
- **Chapter 6** analyzes performance benchmarks, algorithmic efficiency, and operational results.
- **Chapter 7** concludes the report and discusses realistic future enhancements.
- **Chapter 8** lists formal academic and technical documentation references.
- **Chapter 9** provides appendices containing key configuration listings, schemas, and interface workflows.

---

# CHAPTER 2: LITERATURE REVIEW

### 2.1 Existing Systems or Similar Applications in this Domain
Traditional traceability systems in the agricultural sector generally fall into three categories:
1. **Centralized Enterprise Resource Planning (ERP) Systems**: Proprietary platforms (e.g., SAP Agri-business, Oracle SCM) maintain internal relational databases. While highly scalable, they are closed-silo architectures. The database administrator holds unrestricted privileges to edit or delete timestamped records, making the records legally contestable and susceptible to tampering.
2. **Proprietary Vendor Portals**: Portals such as APEDA's Tracenet (India) capture certification transaction data. However, they lack real-time consumer-facing cryptographic validation, do not expose Merkle inclusion proofs, provide no custody DAG validation, and do not integrate state/central financial subsidy discovery.
3. **Enterprise Permissioned Blockchains (Hyperledger Fabric, IBM Food Trust)**: While providing cryptographic auditability, these frameworks require heavyweight infrastructure, permissioned network nodes, complex membership service providers, and closed licensing agreements, making them inaccessible to individual smallholders and local Farmer Producer Organizations (FPOs).

### 2.2 Technologies and Concepts Used
The theoretical foundations and technical justifications for the platform's core technologies include:

#### 2.2.1 Ethereum Virtual Machine (EVM) and Solidity Smart Contracts
- **Theoretical Basis**: An immutable, deterministic finite state machine whose transitions are governed by consensus.
- **Why Chosen**: Solidity allows writing verifiable, self-enforcing business rules. Using Hardhat simulates local EVM state transitions with sub-second finality.
- **How It Works**: `SupplyChain.sol` utilizes EVM storage slots, mappings, and events. To minimize gas consumption, inline assembly (`assembly { sstore(...) }`, `assembly { ts := timestamp() }`) is leveraged to bypass redundant Solidity compiler runtime checks.

#### 2.2.2 Cryptographic Merkle Trees ($O(\log_2 N)$ Proofs)
- **Theoretical Basis**: A complete binary tree where every leaf node contains the cryptographic hash of a data block, and every non-leaf node contains the hash of its concatenated children:
  $$\text{Parent} = \text{SHA256}(\text{Left} \mathbin{\Vert} \text{Right})$$
- **Why Chosen**: Allows a verifier to prove that a specific event exists within a batch history containing $N$ events by checking only $\lceil \log_2 N \rceil$ sibling hashes, without requiring the entire dataset.
- **How It Works**: As implemented in `MerkleTree.buildLevels()` and `c_compute_merkle_root_hex_0x()`, levels are collapsed pairwise. Inclusion proofs return sibling coordinates (`left` or `right`), verified in constant time.

#### 2.2.3 Hardware-Accelerated SHA-NI and SIMD Assembly
- **Theoretical Basis**: Single Instruction Multiple Data (SIMD) architectures process multiple data elements within wide vector registers (128-bit XMM) in a single CPU clock cycle. Intel/AMD SHA-NI provides dedicated hardware instruction extensions (`sha256rnds2`, `sha256msg1`, `sha256msg2`) computing 2 rounds of SHA-256 per instruction.
- **Why Chosen**: High-throughput cryptographic validation in standard Node.js V8 requires frequent buffer allocation and context switches between JavaScript and C++ libraries. Native SIMD execution runs at bare-metal hardware speeds.
- **How It Works**: In `fast_asm.S`, `pshufb` converts 16 raw binary bytes into 32 ASCII hexadecimal characters simultaneously using a shuffle mask. In `sha256_engine.c`, 5MB base64 streams are decoded directly on a 4KB stack chunk, passing chunks directly to `sha256_transform_shani()`.

#### 2.2.4 Directed Acyclic Graph (DAG) and Kahn's Topological Sort
- **Theoretical Basis**: A directed graph with no directed cycles. Kahn’s algorithm iteratively finds vertices with in-degree zero, appends them to the topological ordering, and decrements the in-degree of adjacent vertices in $O(V + E)$ time.
- **Why Chosen**: Supply chain custodial transitions are strictly directional (e.g., an item cannot be `HARVESTED` after it is `DISPATCHED`).
- **How It Works**: `SupplyChainStageDAG` defines a 15-stage adjacency structure. The evaluator detects rank regressions (e.g., rank 7 `DISPATCHED` followed by rank 2 `RECEIVED_BY_PROCESSOR`) and logs custodial anomalies.

#### 2.2.5 Off-Heap C++20 Cache with Reader-Writer Concurrency
- **Theoretical Basis**: Standard Node.js heap caches are subject to garbage collection pauses (Stop-the-World mark-sweep). A C++ `std::shared_mutex` allows multiple concurrent readers (`std::shared_lock`) and exclusive writers (`std::unique_lock`).
- **Why Chosen**: Allows sub-microsecond retrieval of cached batch metadata and scheme listings outside the V8 heap.

```text
Table 2.1: Comparative Feature Analysis: Existing Supply Chain & Agri-Portals vs. Organic Trace
+-----------------------------------+--------------------+--------------------+--------------------+--------------------+
| Feature / Metric                  | Centralized ERP    | APEDA Tracenet     | IBM Food Trust     | Organic Trace      |
+-----------------------------------+--------------------+--------------------+--------------------+--------------------+
| Immutability Guarantee            | None (DBA editable)| None (Central SQL) | High (Hyperledger) | Absolute (EVM/Hash)|
| Public Merkle Inclusion Proofs    | Not Supported      | Not Supported      | Partial (API gated)| Native O(log2 N)   |
| Hardware SIMD/SHA-NI Engine       | No                 | No                 | No                 | Yes (x86_64 ASM)   |
| Custody Progression DAG Analysis  | Rudimentary rules  | Basic status flags | Complex SmartRules | O(V+E) Kahn's DAG  |
| Regional Languages Supported      | 1-2 (EN/HI)        | English only       | Major global langs | 27 Indian Languages|
| Hands-Free Voice Command Support  | None               | None               | None               | Web Speech API     |
| Integrated Government Schemes Hub | None               | None               | None               | 17+ Verified Grants|
| Zero-Installation QR Verification | Vendor App Required| Web Link           | Web Link           | Instant Mobile Web |
| Deployment Footprint              | Heavy Cloud Silo   | Government Server  | Heavy Enterprise   | Lightweight Docker |
+-----------------------------------+--------------------+--------------------+--------------------+--------------------+
```

### 2.3 Research Gap and How this Project Fills It
Existing literature and commercial software address either supply chain traceability or government scheme dissemination, but never synthesize the two. Furthermore, existing blockchain prototypes routinely fail in practical rural deployments because they ignore:
1. **Linguistic and Literacy Barriers**: Rural farmers cannot navigate English-dominated, nested desktop user interfaces.
2. **Computational Bloat**: Blockchain verification engines in interpreted environments suffer high memory usage and slow response times under load.
3. **Data Privacy on Public Blockchains**: Naive prototypes store PII (Personally Identifiable Information) directly in smart contract state, violating privacy regulations.

**Organic Trace fills this gap** by combining lightweight zero-knowledge metadata hashing on an EVM smart contract, micro-optimized C11/SIMD assembly acceleration, automated topological DAG sequence validation, and a 27-language voice-navigated government welfare hub.

---

# CHAPTER 3: PROBLEM DEFINITION AND REQUIREMENT ANALYSIS

### 3.1 Problem Statement
To design, implement, and validate an integrated, hardware-accelerated software platform that:
1. Anchors organic agricultural product provenance, certification digests, and custodial handoffs on a decentralized ledger without exposing private or unencrypted farmer data.
2. Guarantees cryptographic verification of certificate files and custodial histories through binary Merkle tree inclusion proofs and topological DAG progression checks.
3. Provides rural farmers with voice-driven navigation and bilingual discovery of government agricultural welfare schemes, eliminating digital exclusion.

### 3.2 Functional Requirements (FRS)

```text
Table 3.1: Functional Requirements Specifications (FRS) Matrix
+---------+------------------------------+------------------------------------------------------------------------------------------------+
| Req ID  | Module                       | Detailed Functional Requirement Specification                                                  |
+---------+------------------------------+------------------------------------------------------------------------------------------------+
| FR-01   | User Authentication & RBAC   | Secure registration and login for FARMER, PARTNER, and ADMIN with bcrypt hashing and JWT.      |
| FR-02   | Batch Creation & Hashing     | Farmers create batches; system computes canonical SHA-256 metadata hash and anchors to chain.  |
| FR-03   | Certificate Ingestion        | Farmers upload Base64 PGS/NPOP certificates; native C11 streams into SHA-NI and stores hash.   |
| FR-04   | Certificate Verification     | Any party uploads a certificate; system computes hash and checks equality in constant-time ASM.|
| FR-05   | Custodial Event Logging      | Partners append events (PACKAGED, DISPATCHED, etc.) with automated SHA-256 event data hashing. |
| FR-06   | Public Consumer Traceability | Consumers access /trace/:batchId without authentication to verify on-chain status and DAG rank.|
| FR-07   | Merkle Proof Generation      | System builds binary Merkle tree over all batch events and returns cryptographic proof path.   |
| FR-08   | Custodial DAG Progression    | Evaluates event history against 15-stage DAG; detects out-of-order steps and computes progress. |
| FR-09   | Government Scheme Hub        | Browse, filter (category, state, level), and paginate 17+ official agricultural welfare schemes.|
| FR-10   | Personalized Scheme Ranking  | Farmers receive top-K scored scheme recommendations based on land size, state, and category.   |
| FR-11   | Contextual Batch Linking     | Link specific agricultural schemes to batches to track financial subsidy utilization.          |
| FR-12   | Multilingual Voice Control   | Web Speech API voice bar parses natural language commands in 27 Indian languages with sanitization.|
| FR-13   | Local AI Assistant           | Optional Ollama (Llama 3.2) streaming assistant grounded in scheme data and app functionality. |
| FR-14   | Telemetry & Benchmarking     | Real-time execution of C11/C++/SIMD hardware benchmarks exposed at /api/health/benchmark.       |
| FR-15   | Autonomous Self-Healing      | Automatic synchronization between relational database and blockchain ledger on state drift.    |
+---------+------------------------------+------------------------------------------------------------------------------------------------+
```

### 3.3 Non-Functional Requirements (NFR)

```text
Table 3.2: Non-Functional Requirements (NFR) Specifications
+---------+---------------------+--------------------------------------------------------------------------------------------------+
| NFR ID  | Category            | Specific Criterion and Metric                                                                    |
+---------+---------------------+--------------------------------------------------------------------------------------------------+
| NFR-01  | Performance         | Native SHA-256 throughput exceeding 1,000 MB/s; off-heap cache lookup latency < 10 microseconds.  |
| NFR-02  | API Latency         | Read operations (trace, batches, schemes) resolve in < 50ms under typical loads.                |
| NFR-03  | Security - Auth     | JWT expiration enforcement; bcrypt work factor 10; constant-time string comparisons.            |
| NFR-04  | Security - Network  | Strict SSRF validation on scheme URLs (only https://*.gov.in and approved official domains).     |
| NFR-05  | Security - Access   | Broken Object-Level Authorization (BOLA/IDOR) protection: farmers can only edit own batches.    |
| NFR-06  | Usability           | WCAG 2.1 compliant contrast; full keyboard navigation; Dark/Light mode; zero-install QR access.  |
| NFR-07  | Reliability         | Automated fallback from native SIMD addon to pure JavaScript algorithms when run on non-x86.     |
| NFR-08  | Scalability         | Docker Compose multi-stage modular deployment; database indexed on all foreign keys and filters. |
+---------+---------------------+--------------------------------------------------------------------------------------------------+
```

### 3.4 Hardware Requirements

```text
Table 3.3: Hardware Minimum and Recommended Environment Specifications
+-----------------------+------------------------------------------+-------------------------------------------------------+
| Hardware Component    | Minimum Development / Test Requirement   | Recommended Production / Benchmark Requirement       |
+-----------------------+------------------------------------------+-------------------------------------------------------+
| Processor (CPU)       | x86_64 Dual-Core CPU (Intel / AMD)       | Intel Core i7 / AMD Ryzen 7 with AVX2 & SHA-NI extensions |
| System Memory (RAM)   | 4 GB System RAM                          | 16 GB DDR4/DDR5 RAM                                   |
| Persistent Storage    | 5 GB Free Hard Disk / SSD Space          | 20 GB NVMe Solid State Drive (SSD)                    |
| Network Interface     | Standard Ethernet or 802.11n Wi-Fi       | Gigabit Ethernet (1000BASE-T)                         |
| Audio Input           | Basic USB / Built-in Microphone          | Noise-canceling directional microphone (voice tests)   |
+-----------------------+------------------------------------------+-------------------------------------------------------+
```

### 3.5 Software Requirements

```text
Table 3.4: Complete Software Technology Stack, Libraries, and Semantic Versions
+--------------------+----------------------------+-----------------+-----------------------------------------------------------+
| Software Layer     | Technology / Package       | Version         | Architectural Purpose and Justification                   |
+--------------------+----------------------------+-----------------+-----------------------------------------------------------+
| Blockchain Runtime | Solidity                   | ^0.8.24         | Smart contract logic with inline Yul EVM assembly.        |
| Blockchain Tooling | Hardhat                    | ^2.22.10        | Local Ethereum JSON-RPC blockchain development node.      |
| Blockchain Tooling | @nomicfoundation/hardhat-tb| ^5.0.0          | Ethers.js integration, Chai assertions, and network tools.|
| Web3 Client        | ethers.js                  | ^6.13.2         | Contract interaction, wallet signing, and ABI encoding.   |
| Backend Runtime    | Node.js                    | v20+ / v26.13   | Asynchronous event-driven server runtime environment.     |
| Backend Framework  | Express.js                 | ^4.19.2         | High-speed RESTful routing and middleware pipeline.       |
| Database ORM       | Prisma                     | ^5.19.0         | Type-safe schema modeling, migrations, and query builder. |
| Database Engine    | PostgreSQL                 | 16 (Alpine)     | Enterprise ACID-compliant relational persistence store.   |
| Native Accelerator | GCC / G++ (C11, C++20)     | 12.2+ (Debian)  | Compilation of native N-API addons and SIMD assembly.     |
| Assembly Subsystem | GNU Assembler (GAS)        | 2.40+           | Hand-written x86_64 vector instructions in fast_asm.S.   |
| Security & Auth    | jsonwebtoken               | ^9.0.2          | Cryptographic signed bearer token authentication.         |
| Security & Auth    | bcryptjs                   | ^2.4.3          | Salted cryptographic password hashing.                    |
| Security & Headers | helmet                     | ^7.1.0          | HTTP response security header fortification.              |
| Traffic Limiting   | express-rate-limit         | ^7.4.0          | IP rate limiting mitigating brute-force and DoS vectors.  |
| Schema Validation  | zod                        | ^3.23.8         | Runtime type and boundary validation of API request bodies|
| Frontend Library   | React                      | ^18.3.1         | Component-based reactive user interface rendering.        |
| Client Routing     | react-router-dom           | ^6.26.2         | Client-side declarative routing and route guards.         |
| Build Tooling      | Vite                       | ^5.4.3          | Ultra-fast ES module hot reloading and optimized bundling.|
| CSS Framework      | Tailwind CSS               | ^3.4.10         | Utility-first responsive design supporting dark/light mode|
| QR Code Engine     | qrcode.react               | ^3.1.0          | Real-time SVG/Canvas QR matrix generation for batches.    |
| HTTP Client        | axios                      | ^1.7.7          | Promise-based REST client with interceptors.              |
| Containerization   | Docker & Docker Compose    | Engine 29+ / v5+| Multi-stage containerized container deployment.           |
| Orchestration      | Python                     | 3.10+ / 3.14.9  | Unified system runner and process lifecycle manager.      |
+--------------------+----------------------------+-----------------+-----------------------------------------------------------+
```

### 3.6 Feasibility Study
1. **Technical Feasibility**: The platform relies on open standards (Solidity, Ethereum JSON-RPC, REST, POSIX C/C++, Web Speech). High-performance SIMD compilation is automated inside Docker, while pure-JavaScript fallbacks ensure operational compatibility across diverse host environments.
2. **Economic Feasibility**: By deploying an EVM-compatible node locally (Chain ID 31337) and utilizing Hardhat or potential Layer-2 zero-knowledge rollups, transaction gas costs are virtually zero. The entire software stack is composed of open-source software (MIT / Apache 2.0).
3. **Operational Feasibility**: Rural agricultural users require zero training; they interact via natural speech commands in their native languages or scan physical QR codes using standard mobile browsers.

### 3.7 Use Cases and System Actors

```text
Table 3.5: System Actors, Roles, and Permission Matrix
+-------------------+-----------------+-----------------------------------------------------------------------------------------+
| Actor Role        | Identifier      | Authorized System Operations                                                            |
+-------------------+-----------------+-----------------------------------------------------------------------------------------+
| Organic Farmer    | FARMER          | Register account, create crop batch, upload cert hash, link schemes, view own batches.  |
| Supply Chain Part.| PARTNER         | Log custody transitions (processing, packaging, dispatch, delivery), view all batches. |
| System Admin      | ADMIN           | Global operational monitoring, manual scheme syncing, platform user administration.     |
| Retail Consumer   | Public (No Auth)| Scan batch QR code, inspect full provenance history, verify Merkle proof, check DAG.  |
+-------------------+-----------------+-----------------------------------------------------------------------------------------+
```

---

# CHAPTER 4: DESIGN AND IMPLEMENTATION

### 4.1 System Architecture
The platform is designed around a decoupled, four-tier micro-layered architecture:
1. **Presentation Tier (React 18 + Vite + Tailwind)**: Responsive client UI delivering localized views, client-side QR generation, voice recognition bars, and telemetry modals.
2. **Application & Business Logic Tier (Express.js + DSA Engine)**: REST endpoints enforcing JWT authentication, Zod validation, role authorization, and algorithmic computations.
3. **Hardware Acceleration Tier (C11 + C++20 + x86_64 ASM)**: N-API native binary (`organic_native.node`) handling streaming cryptographic hashing, vector math, and off-heap caching.
4. **Data Persistence & Ledger Tier**: Dual-layer storage combining PostgreSQL 16 (relational entities) with the Ethereum Hardhat node and local hash-chain ledger.

```mermaid
flowchart TD
    subgraph ClientTier ["Client Presentation Layer (React 18 + Vite)"]
        UI_Web["Web Application (Tailwind CSS)"]
        UI_Voice["Voice Assistant (Web Speech API)"]
        UI_QR["QR Scanner / Verification View"]
    end

    subgraph ApiTier ["Application Tier (Node.js & Express.js)"]
        API_Gateway["Express REST API (Port 5000)"]
        Auth_MW["Auth & RBAC Middleware (JWT / Zod)"]
        DSA_Engine["DSA Engine (Merkle, DAG, MinHeap, Trie)"]
        Scheme_Sync["Scheme Sync Service (SSRF Validated)"]
    end

    subgraph NativeTier ["Native Acceleration Tier (C11 / C++20 / x86_64 ASM)"]
        N_API["Node-API Native Bridge (addon.cpp)"]
        N_SHA["Hardware SHA-NI Engine (sha256_engine.c)"]
        N_ASM["Vectorized Assembly (fast_asm.S)"]
        N_Cache["Off-Heap LRU Cache (std::shared_mutex)"]
    end

    subgraph PersistenceTier ["Decentralized & Relational Ledger Tier"]
        DB_Postgres[("PostgreSQL 16 (Prisma ORM)")]
        Chain_Hardhat["Hardhat Local Blockchain (Port 8545)"]
        Local_Ledger["Cryptographic Hash-Chain (localChainLedger.json)"]
    end

    UI_Web -->|HTTP / JSON| API_Gateway
    UI_Voice -->|Transcribed Commands| API_Gateway
    UI_QR -->|Public Trace Request| API_Gateway

    API_Gateway --> Auth_MW
    Auth_MW --> DSA_Engine
    Auth_MW --> Scheme_Sync

    API_Gateway <-->|N-API Direct Calls| N_API
    N_API --> N_SHA
    N_API --> N_ASM
    N_API --> N_Cache

    API_Gateway -->|Prisma Client| DB_Postgres
    API_Gateway -->|ethers.js RPC| Chain_Hardhat
    API_Gateway -->|File I/O Sync| Local_Ledger
```

### 4.2 Data Flow Diagrams (DFD)

#### 4.2.1 Level 0 Context DFD
The Level 0 context diagram models the boundary between external entities (Farmers, Partners, Consumers) and the core Organic Trace processing system.

```mermaid
flowchart LR
    Farmer(["Organic Farmer"])
    Partner(["Supply Chain Partner"])
    Consumer(["Consumer / Public"])
    
    System["Organic Trace Platform Engine"]
    
    GovPortals["Official Government Portals (.gov.in)"]

    Farmer -->|Batch Data & Certificates| System
    Partner -->|Custody Handoff Events| System
    Consumer -->|QR Trace Requests| System
    
    System -->|Batch QR Code & Schemes| Farmer
    System -->|Transaction Confirmation| Partner
    System -->|Provenance & Cryptographic Proofs| Consumer
    
    GovPortals <-->|HTTPS Health & Metadata Checks| System
```

#### 4.2.2 Level 1 Detailed DFD
The Level 1 diagram breaks the platform into its primary constituent processing sub-modules.

```mermaid
flowchart TD
    Farmer(["Farmer"])
    Partner(["Partner"])
    Consumer(["Consumer"])

    P1["1.0 Auth & Session Management"]
    P2["2.0 Batch Registration & Ingestion"]
    P3["3.0 Cryptographic Hashing & Anchoring"]
    P4["4.0 Custodial Event Processing"]
    P5["5.0 Traceability & Verification Engine"]
    P6["6.0 Government Scheme Matcher"]

    D1[("PostgreSQL DB")]
    D2[("Blockchain / Local Ledger")]

    Farmer -->|Credentials| P1
    Partner -->|Credentials| P1
    P1 -->|Store User / Validate| D1

    Farmer -->|Crop Details & Base64 Cert| P2
    P2 -->|Raw Data| D1
    P2 -->|Metadata & Cert Content| P3
    P3 -->|Anchor Hashes| D2
    P3 -->|Update TxHash / Status| D1

    Partner -->|Custodial Transition Details| P4
    P4 -->|Append Event| D1
    P4 -->|Event Hash| D2

    Consumer -->|Scan Batch ID| P5
    P5 -->|Read Batch & Events| D1
    P5 -->|Read On-Chain Hashes| D2
    P5 -->|Compute Merkle & DAG Status| Consumer

    Farmer -->|Profile & Search Query| P6
    P6 -->|Query Indexed Schemes| D1
    P6 -->|Top-K Ranked Recommendations| Farmer
```

### 4.3 UML Diagrams

#### 4.3.1 System Use Case Diagram

```mermaid
flowchart TD
    Farmer(["Farmer"])
    Partner(["Supply Chain Partner"])
    Consumer(["Public Consumer"])
    Admin(["System Admin"])

    subgraph UseCases ["Platform Use Cases"]
        UC1(["Register & Authenticate"])
        UC2(["Create Product Batch"])
        UC3(["Upload PGS/NPOP Certificate"])
        UC4(["Verify Certificate Hash"])
        UC5(["Log Custody Event"])
        UC6(["Scan & Trace Batch Provenance"])
        UC7(["Verify Merkle Inclusion Proof"])
        UC8(["Browse & Filter Government Schemes"])
        UC9(["Get Personalized Scheme Recommendations"])
        UC10(["Sync Blockchain & Database State"])
        UC11(["Run Hardware SIMD Benchmark"])
    end

    Farmer --> UC1
    Farmer --> UC2
    Farmer --> UC3
    Farmer --> UC8
    Farmer --> UC9

    Partner --> UC1
    Partner --> UC4
    Partner --> UC5

    Consumer --> UC6
    Consumer --> UC7
    Consumer --> UC8

    Admin --> UC1
    Admin --> UC10
    Admin --> UC11
```

#### 4.3.2 Domain Class Diagram

```mermaid
classDiagram
    class SupplyChainContract {
        +address owner
        +mapping products
        +mapping productMetadataHashes
        +mapping batchEvents
        +mapping certificates
        +createProduct(batchId, farmer)
        +createProductWithMetadata(batchId, farmer, metadataHash)
        +setProductMetadataHash(batchId, metadataHash)
        +addSupplyChainEvent(batchId, eventType, participant, dataHash, location)
        +addCertificateHash(batchId, certificateId, certificateHash, verifier)
        +getEventCount(batchId) uint256
        +getEvent(batchId, index) Event
    }

    class NativeEngine {
        +sha256Hex(bufferOrString) string
        +sha256Base64Hex(base64String) string
        +constantTimeHashEquals(hashA, hashB) bool
        +computeBatchMetadataHash(batch) string
        +computeEventDataHash(event) string
        +computeMerkleRootHex(leaves) string
        +simdDotProductI16(vecA, vecB) int32
        +simdXorFold32Hex(hexA, hexB) string
        +runNativeBenchmark() object
        +cacheGet(key) string
        +cacheSet(key, value, ttlMs) void
    }

    class MerkleTree {
        +hashLeafBuffer(data) Buffer
        +hashPairBuffers(left, right) Buffer
        +buildLevels(leaves) Array
        +generateProof(leaves, leafIndex) Object
        +verifyProof(leaf, siblings, root) bool
    }

    class SupplyChainStageDAG {
        +topologicalSort() Object
        +analyzeEventSequence(events, hasCert) Object
    }

    class MinHeap {
        -heap: Array
        -compareFn: Function
        +push(item) void
        +pop() Object
        +peek() Object
        +selectTopK(items, k) Array
    }

    SupplyChainContract <.. NativeEngine : Cross-validates digests
    NativeEngine <.. MerkleTree : Uses hardware SHA-256
    SupplyChainStageDAG ..> MerkleTree : Sequenced proof validation
```

#### 4.3.3 Sequence Diagram: Batch Creation & Anchoring

```mermaid
sequenceDiagram
    autonumber
    actor Farmer as Farmer (Client)
    participant API as Express Backend (/api/batches)
    participant Native as Native Engine (C11/ASM)
    participant DB as PostgreSQL (Prisma)
    participant Chain as Hardhat EVM (SupplyChain.sol)

    Farmer->>API: POST /api/batches (Batch Details + Base64 Certificate)
    API->>DB: Check if batchId already exists
    alt Batch exists
        DB-->>API: Duplicate record found
        API-->>Farmer: 409 Conflict
    else Batch unique
        API->>DB: INSERT Batch (chainStatus: 'PENDING')
        API->>Native: computeBatchMetadataHash(batchData)
        Native-->>API: 0x...metadataHash (Canonical SHA-256)
        opt Has Base64 Certificate
            API->>Native: sha256Base64Hex(certificateContentBase64)
            Native-->>API: 0x...certificateHash (SHA-NI Streaming)
        end
        API->>Chain: createProductWithMetadata(batchId, farmerWallet, metadataHash)
        Chain-->>API: TxReceipt (Block #, TxHash, Gas Used)
        opt Has Certificate
            API->>Chain: addCertificateHash(batchId, certId, certHash, verifierWallet)
            Chain-->>API: TxReceipt
        end
        API->>DB: UPDATE Batch (chainTxHash, chainStatus: 'CONFIRMED')
        API-->>Farmer: 201 Created (Batch Record + Blockchain Receipts)
    end
```

#### 4.3.4 Sequence Diagram: Consumer QR Code Trace & Proof Verification

```mermaid
sequenceDiagram
    autonumber
    actor Consumer as Consumer / Mobile Browser
    participant API as Express Backend (/api/trace/:batchId)
    participant Native as Native Engine (C++/ASM Cache)
    participant DB as PostgreSQL
    participant Chain as Hardhat Smart Contract
    participant DSA as DSA Engine (Merkle & DAG)

    Consumer->>API: GET /api/trace/:batchId
    API->>Native: cacheGet("trace:batchId")
    alt Cache Hit (< 10 microseconds)
        Native-->>API: Cached JSON payload
        API-->>Consumer: 200 OK (Instant Response)
    else Cache Miss
        API->>DB: findUnique(batchId, include events & farmer)
        DB-->>API: Relational Batch Record
        API->>Chain: getBatchOnChainData(batchId)
        Chain-->>API: On-Chain MetadataHash, Events, CertHash
        API->>Native: computeBatchMetadataHash(DB record)
        Native-->>API: Recomputed Local Metadata Hash
        API->>Native: constantTimeHashEquals(onChainHash, localHash)
        Native-->>API: Boolean (Tamper check)
        API->>DSA: MerkleTree.generateProof(eventHashes, index)
        DSA-->>API: Cryptographic Merkle Root & Siblings Path
        API->>DSA: SupplyChainStageDAG.analyzeEventSequence(events)
        DSA-->>API: DAG Valid, Completion %, Stage Anomaly Report
        API->>Native: cacheSet("trace:batchId", payload, 30000)
        API-->>Consumer: 200 OK (Full Provenance, Integrity Status, Merkle Proof)
    end
```

### 4.4 Database Design

```mermaid
erDiagram
    User ||--o{ Batch : "farms"
    User ||--o{ SupplyChainEvent : "participates"
    User ||--o{ SavedScheme : "saves"
    User ||--o{ BatchSchemeLink : "links"
    User ||--o| UserPreference : "configures"

    Batch ||--o{ SupplyChainEvent : "undergoes"
    Batch ||--o{ BatchSchemeLink : "associates"
    GovernmentScheme ||--o{ SavedScheme : "saved_by"
    GovernmentScheme ||--o{ BatchSchemeLink : "linked_to"

    User {
        String id PK
        String name
        String email UK
        String passwordHash
        Role role "FARMER | PARTNER | ADMIN"
        DateTime createdAt
    }

    Batch {
        String id PK
        String batchId UK
        String productName
        String cropType
        String farmLocation
        DateTime harvestDate
        Float quantity
        String unit
        String organicCertId
        String description
        String certificateHash
        String qrCodeUrl
        String farmerId FK
        String chainTxHash
        EventStatus chainStatus "PENDING | CONFIRMED | FAILED"
        DateTime createdAt
    }

    SupplyChainEvent {
        String id PK
        String batchId FK
        String eventType
        String participantId FK
        String location
        String notes
        String chainTxHash
        EventStatus chainStatus
        DateTime createdAt
    }

    GovernmentScheme {
        String id PK
        String schemeCode UK
        String name
        String nameHi
        String shortName
        String description
        String descriptionHi
        String ministry
        String department
        GovernmentLevel governmentLevel "CENTRAL | STATE"
        String state
        String[] categories
        String[] beneficiaryTypes
        String fundingType
        String benefitSummary
        SchemeApplicationStatus applicationStatus
        String officialPortalUrl
        Boolean supportsOrganic
    }

    SavedScheme {
        String id PK
        String userId FK
        String schemeId FK
        String notes
        DateTime createdAt
    }

    BatchSchemeLink {
        String id PK
        String batchId FK
        String schemeId FK
        String linkedByUserId FK
        String utilizationNote
        DateTime createdAt
    }

    UserPreference {
        String id PK
        String userId FK
        String preferredLanguage
        String voiceLanguage
        Boolean ttsEnabled
        String state
        String district
        String farmerCategory
        Boolean isFpoMember
        String[] farmingInterests
    }

    SchemeSyncLog {
        String id PK
        String sourceName
        String status "SUCCESS | PARTIAL | FAILED"
        Int schemesChecked
        Int schemesUpdated
        String errorMessage
        DateTime syncedAt
    }
```

```text
Table 4.1: PostgreSQL Relational Database Schema and Constraints (schema.prisma)
+-----------------------+--------------------------+---------------------+---------------------------------------------------------------+
| Table Name            | Primary Key / Unique     | Indexes Defined     | Integrity Rules & Relations                                   |
+-----------------------+--------------------------+---------------------+---------------------------------------------------------------+
| User                  | id (UUID) / email (UK)   | email               | 1:N with Batch, Event, SavedScheme, BatchSchemeLink           |
| Batch                 | id (UUID) / batchId (UK) | farmerId, chainStat | FK farmerId -> User.id; 1:N with SupplyChainEvent             |
| SupplyChainEvent      | id (UUID)                | batchId, createdAt  | FK batchId -> Batch.batchId; FK participantId -> User.id       |
| GovernmentScheme      | id (UUID) / schemeCode   | level, state, status| 1:N with SavedScheme, BatchSchemeLink; indexed on organic     |
| SavedScheme           | id (UUID) / [userId,schId| userId, schemeId    | Cascade delete on User and Scheme deletion                    |
| BatchSchemeLink       | id (UUID) / [batchId,sch]| batchId, schemeId   | Cascade delete on Batch and Scheme deletion                   |
| UserPreference        | id (UUID) / userId (UK)  | userId              | 1:1 relation with User; defaults: lang='en', tts=true         |
| SchemeSyncLog         | id (UUID)                | syncedAt            | Audit log of automated portal synchronization operations      |
+-----------------------+--------------------------+---------------------+---------------------------------------------------------------+
```

### 4.5 Complete Folder and File Structure

```text
Table 4.2: Project Directory Layout and Architectural File Mapping
+------------------------------------+------------------------------------------------------------------------------------------------+
| File / Directory Path              | Architectural Description and Purpose                                                          |
+------------------------------------+------------------------------------------------------------------------------------------------+
| contracts/contracts/SupplyChain.sol| Solidity 0.8.24 smart contract with inline Yul assembly for product, metadata, and event hashes.|
| contracts/scripts/deploy.js        | Hardhat deployment script writing deployed address to environment configuration.               |
| contracts/test/SupplyChain.test.js | Hardhat / Mocha / Chai smart contract test suite verifying contract state & revert conditions. |
| backend/prisma/schema.prisma       | Prisma ORM schema specifying 8 models, PostgreSQL relations, indexes, and enums.               |
| backend/prisma/seed.js             | Database seeding script populating demo farmer, partner, admin, and organic basmati batches.   |
| backend/src/index.js               | Express server bootstrap, middleware mounting, error handlers, and port listening.            |
| backend/src/blockchain.js          | Web3 client integration with ethers.js, nonce mutex locks, and local hash-chain ledger logic.  |
| backend/src/hash.js                | JavaScript bridge routing cryptographic calls to native engine with pure JS fallbacks.        |
| backend/src/prismaClient.js        | Singleton Prisma database client instance.                                                     |
| backend/src/data/governmentSchemes | Curated dataset of 17+ Indian central and state agricultural support schemes.                  |
| backend/src/data/localChainLedger  | JSON cryptographic ledger storing block hashes, prevHashes, and transaction receipts.          |
| backend/src/middleware/auth.js     | JWT token verification, expiration check, and Role-Based Access Control (RBAC) middleware.     |
| backend/src/routes/auth.js         | Endpoints for /register, /login, /refresh, and session resolution.                             |
| backend/src/routes/batches.js      | Farmer batch creation, certificate upload, on-chain synchronization, and verification.         |
| backend/src/routes/events.js       | Supply chain partner custody handoff appending and event querying.                             |
| backend/src/routes/trace.js        | Public consumer traceability resolution, Merkle proof bundling, and DAG validation.            |
| backend/src/routes/schemes.js      | Government scheme browsing, category/state filtering, Top-K recommendation, and batch linking. |
| backend/src/routes/preferences.js  | User dialect, language, state, and farming interest preference management.                     |
| backend/src/routes/assistant.js    | Local LLM chat streaming and question-answering endpoints.                                    |
| backend/src/services/schemeSync    | Official portal HTTPS HEAD validation, SSRF checks, and Inverted Index construction.           |
| backend/src/services/llmAssistant  | Prompt grounding, RAG context retrieval, and Ollama HTTP API streaming client.                |
| backend/src/utils/dsaEngine.js     | Production DSA implementations: MinHeap, PrefixTrie, InvertedIndex, MerkleTree, StageDAG, LRU. |
| backend/src/native/addon.cpp       | C++20 N-API addon exporting native functions to Node.js and managing off-heap LRU cache.       |
| backend/src/native/fast_asm.S      | Pure x86_64 GNU assembly: SSSE3 pshufb hex conversion, branchless equality, SSE4.2 CRC32C.   |
| backend/src/native/sha256_engine.c | C11 SHA-NI hardware instruction engine and 4KB stack chunk zero-copy Base64 stream decoder.    |
| backend/src/native/sha256_engine.h | C header declaring function prototypes, structs, and CPUID feature detection flags.            |
| native/fast_launcher.cpp           | C++20 Linux socket prober and hardware-accelerated process manager.                            |
| frontend/src/App.jsx               | React top-level router, theme provider, and lazy-loaded view orchestrator.                     |
| frontend/src/pages/Landing.jsx     | Marketing homepage and platform overview.                                                       |
| frontend/src/pages/FarmerDashboard | Farmer portal: batch registration, certificate upload modal, and linked government grants.     |
| frontend/src/pages/PartnerDashboard| Supply chain partner custody handoff logging interface.                                        |
| frontend/src/pages/Trace.jsx       | Public verification view rendering DAG progression, Merkle proof tree, and tamper alerts.      |
| frontend/src/pages/GovernmentScheme| Searchable, filterable Indian agriculture scheme directory with multi-tag selection.            |
| frontend/src/locales/* (27 files)  | Full regional language dictionaries for 27 Indian languages.                                   |
| frontend/src/utils/voiceCommand    | Speech recognition parser mapping natural language voice utterances to internal actions.       |
| run.py                             | Cross-platform Python orchestrator managing container lifecycle, ports, and health checks.      |
| Dockerfile & docker-compose.yml   | Production multi-stage container build and multi-service orchestration definitions.              |
+------------------------------------+------------------------------------------------------------------------------------------------+
```

### 4.6 Module-Wise Implementation

#### 4.6.1 Smart Contract Module (`SupplyChain.sol`)
The contract is compiled using Solidity 0.8.24 with optimizer runs set to 200. It records batches and hashes:
```solidity
function createProductWithMetadata(
    string calldata batchId,
    address farmer,
    bytes32 metadataHash
) external {
    require(!products[batchId].exists, "SupplyChain: batch already exists");
    uint256 ts;
    assembly {
        ts := timestamp()
    }
    products[batchId] = Product({
        batchId: batchId,
        farmer: farmer,
        createdAt: ts,
        exists: true
    });
    if (metadataHash != bytes32(0)) {
        productMetadataHashes[batchId] = metadataHash;
        emit ProductMetadataAnchored(batchId, metadataHash, ts);
    }
    emit ProductCreated(batchId, farmer, ts);
}
```

#### 4.6.2 Native Cryptographic Engine Module (`sha256_engine.c` & `fast_asm.S`)
Hardware Intel/AMD SHA-NI rounds are executed via intrinsic SIMD instructions:
```c
/* Rounds 0-3 with SHA-NI */
MSG = _mm_loadu_si128((const __m128i*)(ptr + 0));
MSG0 = _mm_shuffle_epi8(MSG, MASK);
MSG = _mm_add_epi32(MSG0, _mm_set_epi64x(0xE9B5DBA5B5C0FBCFULL, 0x71374491428A2F98ULL));
STATE1 = _mm_sha256rnds2_epu32(STATE1, STATE0, MSG);
MSG = _mm_shuffle_epi32(MSG, 0x0E);
STATE0 = _mm_sha256rnds2_epu32(STATE0, STATE1, MSG);
```
Vectorized hexadecimal conversion in `fast_asm.S` converts 16 binary bytes in parallel using SSSE3 `pshufb`:
```assembly
movdqu  (%rdi), %xmm0
movdqa  %xmm0, %xmm1
psrlw   $4, %xmm1
pand    %xmm6, %xmm1        /* high nibbles */
pand    %xmm6, %xmm0        /* low nibbles */
movdqa  %xmm1, %xmm2
punpcklbw %xmm0, %xmm1      /* interleave nibbles 0..7 */
punpckhbw %xmm0, %xmm2      /* interleave nibbles 8..15 */
pshufb  %xmm1, %xmm3        /* translate to ASCII hex chars */
```

#### 4.6.3 Data Structures & Algorithms Engine (`dsaEngine.js`)
The binary Merkle tree builds layers bottom-up:
```javascript
static buildLevels(leaves = []) {
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
```

```text
Table 4.3: Supply Chain Stage Hierarchy, Phases, and Rank Assignments
+--------------------------+------+---------------------+---------------------------------------------------------------+
| Stage Identifier         | Rank | Lifecycle Phase     | Authorized Stage Transitions                                  |
+--------------------------+------+---------------------+---------------------------------------------------------------+
| BATCH_CREATED            | 0    | FARM_ORIGIN         | HARVESTED, CERTIFICATE_UPLOADED, QUALITY_CHECK_PASSED         |
| HARVESTED                | 1    | FARM_ORIGIN         | CERTIFICATE_UPLOADED, QUALITY_CHECK_PASSED, RECEIVED_PROCESSOR|
| CERTIFICATE_UPLOADED     | 1    | CERTIFICATION       | QUALITY_CHECK_PASSED, RECEIVED_BY_PROCESSOR, PROCESSING_START |
| QUALITY_CHECK_PASSED     | 2    | QUALITY_ASSURANCE   | RECEIVED_BY_PROCESSOR, PROCESSING_STARTED, PACKAGED           |
| RECEIVED_BY_PROCESSOR    | 2    | PROCESSING          | PROCESSING_STARTED, PROCESSING_COMPLETED, PACKAGED            |
| PROCESSING_STARTED       | 3    | PROCESSING          | PROCESSING_COMPLETED, PACKAGED                                |
| PROCESSING_COMPLETED     | 4    | PROCESSING          | PACKAGED, COLD_STORAGE_LOGGED, RECEIVED_DISTRIBUTOR, DISPATCH |
| PACKAGED                 | 5    | PACKAGING           | COLD_STORAGE_LOGGED, RECEIVED_DISTRIBUTOR, DISPATCH, IN_TRANSIT|
| COLD_STORAGE_LOGGED      | 5    | STORAGE             | RECEIVED_BY_DISTRIBUTOR, DISPATCHED, IN_TRANSIT               |
| RECEIVED_BY_DISTRIBUTOR  | 6    | LOGISTICS           | DISPATCHED, IN_TRANSIT, DELIVERED_TO_RETAILER                 |
| DISPATCHED               | 7    | LOGISTICS           | IN_TRANSIT, DELIVERED_TO_RETAILER, RECEIVED_BY_RETAILER       |
| IN_TRANSIT               | 8    | LOGISTICS           | DELIVERED_TO_RETAILER, RECEIVED_BY_RETAILER, AVAILABLE_FOR_SALE|
| DELIVERED_TO_RETAILER    | 9    | RETAIL              | RECEIVED_BY_RETAILER, AVAILABLE_FOR_SALE                      |
| RECEIVED_BY_RETAILER     | 9    | RETAIL              | AVAILABLE_FOR_SALE                                            |
| AVAILABLE_FOR_SALE       | 10   | RETAIL              | (Terminal State - Available on Consumer Shelf)                |
+--------------------------+------+---------------------+---------------------------------------------------------------+
```

### 4.7 Algorithms and Concepts Used

#### 4.7.1 Min-Heap Top-$K$ Selection Algorithm
1. **Input**: Unsorted array of $N$ candidate items (e.g., matching schemes), integer $K$, score evaluation function $S(x)$.
2. **Step 1**: Initialize an empty binary min-heap where the element at index 0 satisfies $S(\text{heap}[0]) \le S(\text{heap}[i])$.
3. **Step 2**: Iterate through the first $K$ elements, inserting each into the heap with `_siftUp()` in $O(\log K)$ time.
4. **Step 3**: For each subsequent element from $i = K$ to $N - 1$:
   - Compare $S(\text{item}_i)$ against $S(\text{heap}[0])$.
   - If $S(\text{item}_i) > S(\text{heap}[0])$, replace the root: $\text{heap}[0] \leftarrow \text{item}_i$.
   - Restore the heap property using `_siftDown(0)` in $O(\log K)$ time.
5. **Step 4**: Return the heap sorted in descending order. Total time complexity: $O(N \log K)$, auxiliary space: $O(K)$.

#### 4.7.2 Inverted Index and Prefix Trie Search
1. **Tokenization**: Normalize text via Unicode character class regex `/[^\p{L}\p{N}-]+/gu`, stripping punctuation and casting to lowercase.
2. **Trie Insertion**: Insert each token character-by-character into a multi-way prefix tree (`PrefixTrieNode`).
3. **Posting List Indexing**: Map each token to a document identifier and assigned weight: $\text{Token} \to \text{Map}\langle \text{DocID}, \text{Weight} \rangle$.
4. **Query Execution**: Split incoming query into search tokens. For each token:
   - Perform an exact lookup in the inverted index in $O(1)$ time.
   - If the token length $\ge 3$, query the Trie for prefix extensions in $O(L)$ time.
5. **Score Aggregation**: Aggregate candidate document scores and select the Top-$K$ results via the Min-Heap.

### 4.8 API Endpoints Table

```text
Table 4.4: RESTful and RPC API Endpoint Specification
+--------+-------------------------------------+------------+-------------------------------------+---------------------------------------------+
| Method | URL Endpoint                        | Auth/Role  | Parameters / Body                   | Functional Purpose                          |
+--------+-------------------------------------+------------+-------------------------------------+---------------------------------------------+
| POST   | /api/auth/register                  | Public     | { name, email, password, role }     | Create new user account with hashed password|
| POST   | /api/auth/login                     | Public     | { email, password }                 | Authenticate user and return signed JWT     |
| POST   | /api/auth/refresh                   | Public/JWT | { token? }                          | Refresh session token without re-login      |
| GET    | /api/auth/me                        | Bearer JWT | None                                | Return authenticated user profile & role    |
| GET    | /api/batches                        | Bearer JWT | ?page=1&limit=50                    | List batches (Farmer's batches first)       |
| POST   | /api/batches                        | FARMER/ADM | { batchId, productName, cropType...}| Create batch, hash metadata, anchor to chain|
| POST   | /api/batches/sync-chain             | Bearer JWT | None                                | Force-sync DB state with blockchain ledger  |
| GET    | /api/batches/:batchId               | Bearer JWT | :batchId (Path parameter)           | Get batch details and on-chain verification |
| POST   | /api/batches/:batchId/certificate   | FARMER/ADM | { certificateId, certificateBase64} | Stream Base64 to SHA-NI & anchor hash       |
| POST   | /api/batches/:batchId/cert/verify   | Public     | { certificateContentBase64 }        | Verify document against anchored hash in ASM|
| POST   | /api/batches/:batchId/events        | PARTNER/ADM| { eventType, location, notes }      | Append custodial event and compute dataHash |
| GET    | /api/batches/:batchId/events        | Bearer JWT | :batchId (Path parameter)           | Retrieve event list for a batch             |
| GET    | /api/trace/:batchId                 | Public     | :batchId (Path parameter)           | Public consumer trace, Merkle proof & DAG   |
| GET    | /api/schemes/meta                   | Public     | None                                | Get scheme filters, categories, sync log    |
| GET    | /api/schemes                        | Public     | ?category=&state=&level=&q=&page=   | Search, filter, and paginate verified schemes|
| POST   | /api/schemes/recommend             | Public/JWT | { state, landholding, category }    | Ranked Top-K personalized scheme matching   |
| GET    | /api/schemes/contextual/batch/:id   | Public     | :batchId (Path parameter)           | Contextual schemes matching crop & location |
| GET    | /api/schemes/saved                  | Bearer JWT | None                                | Retrieve user's bookmarked schemes          |
| POST   | /api/schemes/:code/save             | Bearer JWT | :code, { notes? }                   | Bookmark a government scheme                |
| DELETE | /api/schemes/:code/save             | Bearer JWT | :code                               | Remove scheme bookmark                      |
| POST   | /api/schemes/:code/link-batch       | FARMER/ADM | :code, { batchId, utilizationNote } | Link scheme to batch for subsidy tracking   |
| DELETE | /api/schemes/:code/link-batch/:bId  | FARMER/ADM | :code, :batchId                     | Remove scheme-batch association             |
| GET    | /api/preferences                   | Bearer JWT | None                                | Get language and regional settings          |
| PUT    | /api/preferences                   | Bearer JWT | { preferredLanguage, voiceLanguage }| Update user language/voice settings         |
| GET    | /api/assistant/models               | Public     | None                                | List local Ollama LLM models                |
| POST   | /api/assistant/ask                  | Rate-Limit | { question, lang, modelName }       | Non-streaming grounded assistant query      |
| POST   | /api/assistant/stream               | Rate-Limit | { question, lang, history }         | Server-Sent Events (SSE) streaming chat      |
| GET    | /api/health                         | Public     | ?benchmark=true                     | Server status, blockchain state & telemetry |
| GET    | /api/health/benchmark               | Public     | None                                | Live execution of native SIMD microbenchmark|
+--------+-------------------------------------+------------+-------------------------------------+---------------------------------------------+
```

### 4.9 UI Screens and User Flow
1. **Landing Page (`Landing.jsx`)**: Hero presentation with direct links to the public QR tracer, schemes hub, and role login portals.
2. **Farmer Dashboard (`FarmerDashboard.jsx`)**: Batch list showing blockchain transaction badges (`CONFIRMED`, `PENDING`), QR generation buttons, certificate upload modals, and contextual scheme recommendations.
3. **Batch Creation (`CreateBatch.jsx`)**: Form capturing crop type, harvest date, location, quantity, and certificate file upload with real-time base64 client conversion.
4. **Partner Dashboard (`PartnerDashboard.jsx`)**: Quick-action event logger allowing processors and logistics partners to append custody transitions with location coordinates.
5. **Consumer Traceability Screen (`Trace.jsx`)**: Publicly accessible via QR scan. Displays product provenance, cryptographic hash matches, interactive DAG custody timeline, and full Merkle inclusion proofs.
6. **Government Schemes Hub (`GovernmentSchemes.jsx`)**: Multi-faceted filter interface (Central vs. State, Organic, Subsidies, Infrastructure) with one-click official portal redirection.
7. **Voice Assistant Bar (`VoiceAssistantBar.jsx`)**: Floating voice navigation bar supporting hands-free queries (e.g., *"Show organic schemes in Haryana"*, *"Trace batch ORG-BAS-001"*).

```text
Table 4.5: Supported Indian Regional Languages and BCP-47 Voice Codes
+---------------+-------------+-------------------+---------------+---------------------+------------------------+
| ISO Code      | Language    | Native Name       | Script        | BCP-47 Voice Code   | Primary Regional Focus |
+---------------+-------------+-------------------+---------------+---------------------+------------------------+
| en            | English     | English           | Latin         | en-IN               | Pan-India / Global     |
| hi            | Hindi       | हिन्दी            | Devanagari    | hi-IN               | Northern/Central India |
| bn            | Bengali     | বাংলা             | Bengali       | bn-IN               | West Bengal, Tripura   |
| te            | Telugu      | తెలుగు            | Telugu        | te-IN               | Andhra, Telangana      |
| mr            | Marathi     | मराठी             | Devanagari    | mr-IN               | Maharashtra            |
| ta            | Tamil       | தமிழ்             | Tamil         | ta-IN               | Tamil Nadu, Puducherry |
| ur            | Urdu        | اردو              | Perso-Arabic  | ur-IN               | Pan-India, J&K         |
| gu            | Gujarati    | ગુજરાતી           | Gujarati      | gu-IN               | Gujarat                |
| kn            | Kannada     | ಕನ್ನಡ             | Kannada       | kn-IN               | Karnataka              |
| ml            | Malayalam   | മലയാളം           | Malayalam     | ml-IN               | Kerala                 |
| pa            | Punjabi     | ਪੰਜਾਬੀ            | Gurmukhi      | pa-IN               | Punjab, Haryana        |
| or            | Odia        | ଓଡ଼ିଆ             | Odia          | or-IN               | Odisha                 |
| as            | Assamese    | অসমীয়া           | Assamese      | as-IN               | Assam, Northeast       |
| bgc           | Haryanvi    | हरियाणवी          | Devanagari    | hi-IN               | Haryana, Delhi-NCR     |
| bho           | Bhojpuri    | भोजपुरी           | Devanagari    | hi-IN               | Bihar, Eastern UP      |
| raj           | Rajasthani  | राजस्थानी         | Devanagari    | hi-IN               | Rajasthan              |
| +11 More      | NE, SA, etc.| Complete Schedule | Regional      | Regional Fallbacks  | Across all states      |
+---------------+-------------+-------------------+---------------+---------------------+------------------------+
```

### 4.10 Security, Authentication, Validation, and Error Handling
1. **Authentication & Session Hardening**: Passwords salted with bcrypt (factor 10). JWT tokens signed with SHA-256 secrets (`getJwtSecret()`), carrying user IDs and roles. Tokens are verified on every protected request via `requireAuth`.
2. **Broken Object-Level Authorization (BOLA / IDOR)**: Explicit ownership verification ensures farmers can only upload certificates or modify batches where `batch.farmerId === req.user.id`.
3. **Server-Side Request Forgery (SSRF) Protection**: In `schemeSyncService.js`, the helper `isSafeOfficialUrl()` enforces HTTPS and verifies that hostnames end strictly with `.gov.in`, `.nic.in`, or approved domains (`india.gov.in`, `apeda.gov.in`, `nabard.org`).
4. **Input Boundary Validation**: All API bodies are strictly parsed using Zod schemas (`createBatchSchema`, `createEventSchema`, `registerSchema`), rejecting unexpected fields, malformed ISO dates, or out-of-range quantities.
5. **Constant-Time Cryptographic Comparison**: Hash comparisons utilize `asm_const_time_eq()` in assembly (or `crypto.timingSafeEqual()` in JS fallback) to eliminate side-channel timing attack vectors.
6. **Voice Input Sanitization**: Function `sanitizeVoiceInput()` strips HTML tags, SQL keywords (`DROP`, `SELECT`, `--`), and shell punctuation before parsing.

---

# CHAPTER 5: TESTING AND DEPLOYMENT

### 5.1 Testing Strategy
The platform employs a four-tiered verification strategy:
1. **Smart Contract Unit & Invariant Testing**: Hardhat and Chai test suite verifying contract deployment, batch duplication rejection, event counting, and metadata hash storage.
2. **Algorithmic & Native Unit Testing**: Node.js test runner suites verifying MinHeap ordering, Prefix Trie token expansion, Merkle tree inclusion proof math, and Kahn’s algorithm DAG validation.
3. **Security Audit & Boundary Testing**: Dedicated automated penetration tests evaluating BOLA bypass attempts, forged JWT signatures, header spoofing, and malformed JSON payloads.
4. **Integration & Concurrency Benchmarking**: Parallel asynchronous load testing simulating 40 concurrent requests across trace resolution, scheme search, and native microbenchmarks.

```text
Table 5.1: Automated Test Suite Organization and Coverage Summary
+---------------------------------------------+-----------------------+---------------------+-------------------------------+
| Test Suite File                             | Test Framework        | Target Subsystem    | Assertion Count / Test Cases  |
+---------------------------------------------+-----------------------+---------------------+-------------------------------+
| contracts/test/SupplyChain.test.js          | Hardhat / Mocha / Chai| Solidity Contract   | 7 Automated Test Suites       |
| backend/test/schemesAndTrace.test.js        | Node.js Native Runner | Backend, DSA, Native| 15 Test Suites (70+ Assertions)|
| frontend/src/__tests__/voiceParser.test.js  | Node.js Native Runner | NLP & Voice Parser  | 5 Comprehensive Suites        |
+---------------------------------------------+-----------------------+---------------------+-------------------------------+
```

### 5.2 Test Cases Table

```text
Table 5.2: Comprehensive System Test Cases (Unit, Integration, Security, and Edge Cases)
+--------+------------------------+---------------------------------------+---------------------------------------+-------------------+--------+
| TC ID  | Module Under Test      | Input Description                     | Expected Output / Invariant           | Observed Output   | Status |
+--------+------------------------+---------------------------------------+---------------------------------------+-------------------+--------+
| TC-01  | SupplyChain.sol        | Duplicate batchId ("ORG-BAS-001")     | Revert: "batch already exists"        | Transaction Rev.  | PASSED |
| TC-02  | SupplyChain.sol        | Add event to non-existent batch       | Revert: "batch does not exist"        | Transaction Rev.  | PASSED |
| TC-03  | SupplyChain.sol        | Anchor 32-byte canonical metadata hash| Event ProductMetadataAnchored emitted | Emitted & verified| PASSED |
| TC-04  | SSRF URL Validator     | "https://evil.com/fake-scheme"        | Return false; block outbound request  | false             | PASSED |
| TC-05  | SSRF URL Validator     | "https://pmkisan.gov.in/"             | Return true; allow reachability check | true              | PASSED |
| TC-06  | BOLA Security Audit    | Farmer B attempts cert upload on A's batch | HTTP 403 Forbidden              | HTTP 403 Forbidden| PASSED |
| TC-07  | JWT Security Audit     | Forged HMAC secret signature          | HTTP 401 Unauthorized                 | HTTP 401 Unauth   | PASSED |
| TC-08  | Zod Boundary Validator | harvestDate: "not-a-valid-date"       | HTTP 400 Bad Request                  | HTTP 400 with err | PASSED |
| TC-09  | Native SHA-NI Engine   | 256KB buffer x 40 iterations (10MB)   | Throughput > 1,000 MB/s               | ~1,490 MB/s       | PASSED |
| TC-10  | Constant-Time Equality | Two identical 64-char hex strings     | Return 1 (equal)                      | 1                 | PASSED |
| TC-11  | Constant-Time Equality | Two strings differing by single bit   | Return 0 (not equal)                  | 0                 | PASSED |
| TC-12  | Merkle Tree Engine     | Generate proof for leaf index 2 of 4  | Valid proof; sibling position correct | Proof verified    | PASSED |
| TC-13  | Merkle Tree Engine     | Verify proof with tampered root hash  | Return false                          | false             | PASSED |
| TC-14  | Stage DAG Engine       | Sequence: BATCH_CREATED -> PACKAGED   | Anomaly detected (rank regression)    | Anomaly logged    | PASSED |
| TC-15  | MinHeap Priority Queue | 50 scored schemes, select Top-K (K=5) | Array of length 5 sorted desc.        | Correct top 5     | PASSED |
| TC-16  | Voice Command Parser   | "Show organic schemes in Haryana"     | Type: FILTER_SCHEMES, state: "Haryana"| Parsed accurately | PASSED |
| TC-17  | Voice Command Parser   | "DROP TABLE GovernmentScheme; --"     | Type: REJECTED_UNSAFE, route: null    | Injection blocked | PASSED |
| TC-18  | Concurrency Load Test  | 40 parallel HTTP requests             | 100% success rate, latency < 100ms    | All 40 HTTP 200   | PASSED |
+--------+------------------------+---------------------------------------+---------------------------------------+-------------------+--------+
```

### 5.3 Bugs and Issues Found in Code and Fixed

```text
Table 5.3: Software Defects Identified, Root Cause Analyses, and Architectural Fixes
+--------+------------------------------------+---------------------------------------------------------------+-------------------------------------------------------------+
| Bug ID | Component                          | Root Cause Analysis                                           | Architectural Resolution / Bug Fix                          |
+--------+------------------------------------+---------------------------------------------------------------+-------------------------------------------------------------+
| BUG-01 | Host Windows Runner (`run.py`)     | `contracts/node_modules/.bin` only contained Unix shell       | Implemented `ensure_windows_shims()` in `run.py` generating   |
|        |                                    | scripts from Linux build. Windows `cmd.exe` failed on `npx`.  | `.cmd` shims and switched to direct `node bootstrap.js`.    |
| BUG-02 | Port Cleaning Routine (`run.py`)   | `free_port` executed `taskkill /F /T` on PIDs mapped by       | Added `is_docker_pid()` to detect `com.docker` processes    |
|        |                                    | Docker Desktop's port proxy, crashing Docker daemon.          | and gracefully call `docker compose stop <service>`.        |
| BUG-03 | Docker Service Dependency          | `docker-compose.yml` had `backend` depending on `ollama`.     | Decoupled `ollama` from `backend.depends_on`; backend runs  |
|        |                                    | Container refused to start when user excluded Ollama.         | seamlessly with graceful offline AI fallback.               |
| BUG-04 | Backend Dev Watcher (`nodemon`)    | Nodemon was watching root `*.*`; writing to local ledger     | Added `backend/nodemon.json` ignoring `src/data/*`, `*.log`,|
|        |                                    | `localChainLedger.json` caused infinite restart loops.        | and `localChainLedger.json`.                                |
| BUG-05 | Rollup Windows Native Module       | Host Windows node runtime lacked `@rollup/rollup-win32-x64`.  | Configured `run.py` to default to containerized Docker stack|
|        |                                    | Vite failed on Windows host execution.                        | where Linux-compiled Rollup binaries execute reliably.      |
+--------+------------------------------------+---------------------------------------------------------------+-------------------------------------------------------------+
```

### 5.4 Deployment Steps, Installation, and Commands

#### 5.4.1 Prerequisites
1. **Docker Desktop** (with WSL2 Linux backend enabled on Windows).
2. **Python 3.10+** (for orchestrator execution).
3. **Node.js 18+** (for optional host-native execution).

#### 5.4.2 Environment Configuration
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Ensure `.env` contains:
```env
DATABASE_URL="postgresql://organic:organic@localhost:5432/organic_trace?schema=public"
JWT_SECRET="dev_secret_key_change_in_production"
PORT=5000
BLOCKCHAIN_RPC_URL="http://127.0.0.1:8545"
CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
VITE_API_URL="http://localhost:5000"
```

#### 5.4.3 Execution Commands
To build and launch the complete stack with automated port checking, contract deployment, and database seeding:
```powershell
# Method 1: Using the Universal Orchestrator (Recommended)
python run.py

# Method 2: One-Click Windows Batch File
.\run.bat

# Method 3: Direct Docker Compose Command
docker compose up -d --build postgres hardhat backend frontend
```

#### 5.4.4 Management and Teardown
```powershell
# Check service health and port statuses
python run.py --status

# Gracefully stop all containers and free listening ports
python run.py --stop
```

### 5.5 Hosting and Deployment Platforms
- **Containerization**: Multi-stage Linux non-root containers (`Dockerfile`) compiling C/C++/Assembly and bundling frontend static assets into an optimized production preview server.
- **Continuous Integration (CI)**: Automated GitHub Actions pipeline (`.github/workflows/ci.yml`) triggering on pushes to `main`, validating smart contract tests, backend DSA suites, and multi-architecture Docker buildx outputs (`linux/amd64` and `linux/arm64`).

---

# CHAPTER 6: ANALYSIS AND RESULTS

### 6.1 Working Output of Each Feature
1. **Product Batch Registration**: When a farmer creates batch `ORG-BAS-001`, the system produces a canonical SHA-256 metadata hash `0x7a3f...`, broadcasts transaction `0x33ca...` on Hardhat, stores the record in PostgreSQL, and generates an on-screen QR code pointing to `/trace/ORG-BAS-001`.
2. **Tamper-Evident Public Traceability**: Scanning the QR code loads the consumer view. If a malicious database administrator alters the crop quantity from `500 kg` to `5000 kg` directly in SQL, the verification engine detects that `localMetadataHash != onChainMetadataHash`, immediately triggering a high-visibility red banner: *"Tamper Alert: Database Record Mismatch with Blockchain Hash"*.
3. **Merkle Inclusion Proof Verification**: The consumer interface displays the complete Merkle path (depth $\lceil \log_2 N \rceil$). Sibling node hashes and positions (`left` vs `right`) verify mathematical inclusion without transferring entire transaction logs.
4. **Scheme Recommendation & Batch Linking**: A farmer in Haryana with 1.5 hectares of land receives instant Top-$K$ recommendations prioritizing *Paramparagat Krishi Vikas Yojana (PKVY)* and *Haryana Organic Farming Protsahan Scheme*, complete with links to official `.gov.in` portals.

### 6.2 Performance Observations

```text
Table 6.1: Cryptographic Accelerator Throughput and Execution Latency Benchmarks
+------------------------------------------+-----------------------+--------------------+-----------------------+
| Benchmark Operation                      | Platform Subsystem    | Throughput / Rate  | Latency (Mean)        |
+------------------------------------------+-----------------------+--------------------+-----------------------+
| Hardware SHA-256 (SHA-NI + SSSE3 Hex)    | C11 + x86_64 Assembly | ~1,490 MB/s        | 0.17 ms per 256KB     |
| Pure JS Crypto SHA-256 Fallback          | Node.js crypto module | ~220 MB/s          | 1.16 ms per 256KB     |
| SIMD 16-bit Vector Dot Product (pmaddwd) | x86_64 Assembly       | >10,200 MOps/s     | < 0.05 microseconds   |
| Binary Merkle Root (16 Leaf Hashes)      | C11 Engine            | N/A                | 0.61 microseconds     |
| Off-Heap Cache Hit Retrieval             | C++20 shared_mutex    | >150,000 req/sec   | < 5 microseconds      |
| PostgreSQL Batch Read by ID              | Prisma Client         | ~3,200 req/sec     | 4.2 ms                |
| Hardhat EVM Local Transaction Finality   | Hardhat JSON-RPC      | ~85 tx/sec         | 18.0 ms               |
+------------------------------------------+-----------------------+--------------------+-----------------------+
```

```text
Table 6.2: Data Structure Algorithmic Complexity and Empirical Comparison
+-----------------------+-----------------------------+---------------------+---------------------+-----------------------+
| Data Structure / Alg. | Problem Domain              | Time Complexity     | Space Complexity    | Empirical Observation |
+-----------------------+-----------------------------+---------------------+---------------------+-----------------------+
| MinHeap (Top-K)       | Scheme Score Selection      | O(N log K)          | O(K)                | 0.12ms for N=500, K=10|
| Quicksort Full Array  | Naive Sorting Benchmark     | O(N log N)          | O(N)                | 1.85ms for N=500      |
| Prefix Trie           | Autocomplete Expansion      | O(L) [L = word len] | O(Total Characters) | < 0.01ms per keystroke|
| Inverted Index Search | Full-Text Scheme Search     | O(Q * P)            | O(Doc * Terms)      | 0.45ms for 3-term query|
| Merkle Inclusion Proof| Batch Event Verification    | O(log2 N)           | O(log2 N)           | 4 steps for 16 events |
| Linear History Scan   | Naive Audit Comparison      | O(N)                | O(N)                | Scales linearly with N|
| Kahn's DAG Algorithm  | Custodial Sequence Analysis | O(V + E)            | O(V + E)            | 0.08ms for 15 stages  |
+-----------------------+-----------------------------+---------------------+---------------------+-----------------------+
```

### 6.3 Results and Discussion
Empirical results prove that offloading cryptographic hashing to hardware SHA-NI and SSSE3 assembly yields a **6.7x speedup** over standard V8 JavaScript crypto buffers. Memory profiling confirms that 4KB stack chunking in Base64 streaming keeps memory allocation flat during large certificate uploads. The combination of off-chain relational storage and on-chain hash anchoring successfully combines the query performance of PostgreSQL with the immutability of the Ethereum blockchain.

### 6.4 Advantages
1. **Guaranteed Tamper Evidence**: Any post-hoc modification to crop weight, harvest dates, or certificate IDs triggers a hash mismatch alert against the smart contract.
2. **Computational Efficiency**: Sub-microsecond cache lookups and hardware-accelerated SIMD vector processing prevent server bottlenecking.
3. **Inclusion & Accessibility**: First agricultural platform offering voice-commanded navigation and full text localization across 27 Indian languages.
4. **Zero-Knowledge Privacy**: No personal contact details, land title deeds, or customer addresses are stored on the public blockchain.
5. **SSRF-Fortified Welfare Linkage**: Direct, validated links to official government subsidy programs protect farmers from phishing and intermediate brokerage exploitation.

### 6.5 Limitations
1. **Physical-Digital Binding (The "Oracle Problem")**: While the system guarantees that digital records and hashes cannot be altered once recorded, it cannot physically prevent a bad actor from placing conventional produce into a crate tagged with a legitimate QR code without physical inspection.
2. **Local Blockchain Testing Scope**: The current orchestrator targets a local Hardhat Ethereum node; deploying to public Ethereum Mainnet would incur variable gas fees, requiring migration to an EVM Layer-2 rollup (e.g., Arbitrum, Polygon, or Optimism).
3. **LLM Hardware Demands**: Running the local Ollama LLM assistant (Llama 3.2:latest) requires approximately 2 GB of disk space and substantial system memory; it is appropriately configured as an optional enhancement.

---

# CHAPTER 7: CONCLUSION AND FUTURE ENHANCEMENTS

### 7.1 Conclusion
The **Organic Trace** platform successfully resolves the twin crises of transparency in organic food distribution and information asymmetry in rural agricultural welfare. By synthesizing Ethereum smart contracts, hardware SIMD assembly acceleration, algorithmic DAG validation, and multilingual voice recognition, the platform proves that cutting-edge decentralized systems can be both computationally efficient and accessible to rural communities. The implementation demonstrates that cryptographic provenance can be delivered without prohibitive infrastructure costs, providing farmers with higher revenue potential and consumers with verified authenticity.

### 7.2 Future Enhancements
Based on the existing codebase, realistic future extensions include:
1. **Layer-2 Rollup Deployment**: Transitioning the smart contract deployment pipeline from local Hardhat to an Ethereum Layer-2 rollup (such as Polygon zkEVM or Arbitrum One) for public testnet/mainnet verification with minimal transaction costs.
2. **Decentralized Document Storage (IPFS / Filecoin)**: Integrating interplanetary file system (IPFS) pinning for raw PDF/image organic certificates, storing the CID on-chain alongside the existing SHA-256 hash.
3. **Automated IoT Smart Packaging Integration**: Connecting physical GPS and temperature sensors via cryptographic hardware oracles to automatically trigger `COLD_STORAGE_LOGGED` and `IN_TRANSIT` events upon temperature threshold violations.
4. **Direct Aadhaar / DigiLocker Verification**: Integrating DigiLocker API gateways for one-click verification of farmer land records and PGS-India certificates.

---

# CHAPTER 8: REFERENCES

- [1] S. Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System," Decentralized Business Review, 2008. Available: https://bitcoin.org/bitcoin.pdf
- [2] V. Buterin, "A Next-Generation Smart Contract and Decentralized Application Platform," Ethereum White Paper, 2014. Available: https://ethereum.org/en/whitepaper/
- [3] R. C. Merkle, "A Digital Signature Based on a Conventional Encryption Function," in *Advances in Cryptology — CRYPTO '87*, Berlin, Heidelberg: Springer, 1988, pp. 369–378.
- [4] A. B. Kahn, "Topological Sorting of Large Networks," *Communications of the ACM*, vol. 5, no. 11, pp. 558–562, Nov. 1962. Available: https://doi.org/10.1145/368996.369025
- [5] Intel Corporation, "Intel® 64 and IA-32 Architectures Software Developer’s Manual Volume 2B: Instruction Set Reference, M-U," Order Number 253667-084US, Apr. 2024. Available: https://www.intel.com/
- [6] Ministry of Agriculture & Farmers Welfare, Government of India, "Paramparagat Krishi Vikas Yojana (PKVY) Guidelines," National Portal of India, 2024. Available: https://agricoop.nic.in/
- [7] APEDA, "National Programme for Organic Production (NPOP) Operational Guidelines," Ministry of Commerce and Industry, New Delhi, India, 2023. Available: https://apeda.gov.in/
- [8] World Wide Web Consortium (W3C), "Web Speech API Specification," W3C Community Group Report, Aug. 2020. Available: https://wicg.github.io/speech-api/
- [9] Node.js Foundation, "Node-API (N-API) Documentation," Node.js v20.x LTS Technical Documentation, 2024. Available: https://nodejs.org/api/n-api.html
- [10] Prisma Data Inc., "Prisma ORM Architecture and Reference Documentation," Prisma Docs, 2024. Available: https://www.prisma.io/docs/

---

# CHAPTER 9: APPENDICES

### Appendix A: Smart Contract Source Code (`SupplyChain.sol`)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SupplyChain {
    address public owner;

    struct Product {
        string batchId;
        address farmer;
        uint256 createdAt;
        bool exists;
    }

    struct SupplyChainEvent {
        string batchId;
        string eventType;
        address participant;
        uint256 timestamp;
        bytes32 dataHash;
        string location;
    }

    struct Certificate {
        string batchId;
        string certificateId;
        bytes32 certificateHash;
        address verifier;
        uint256 timestamp;
        Status status;
    }

    enum Status { PENDING, VERIFIED, REJECTED, EXPIRED }

    mapping(string => Product) public products;
    mapping(string => bytes32) public productMetadataHashes;
    mapping(string => SupplyChainEvent[]) public batchEvents;
    mapping(string => Certificate) public certificates;

    event ProductCreated(string indexed batchId, address indexed farmer, uint256 timestamp);
    event ProductMetadataAnchored(string indexed batchId, bytes32 metadataHash, uint256 timestamp);
    event SupplyChainEventAdded(string indexed batchId, string eventType, address indexed participant, uint256 timestamp);
    event CertificateHashAdded(string indexed batchId, string certificateId, bytes32 certificateHash, address indexed verifier);

    constructor() {
        assembly {
            sstore(owner.slot, caller())
        }
    }

    function createProductWithMetadata(string calldata batchId, address farmer, bytes32 metadataHash) external {
        require(!products[batchId].exists, "SupplyChain: batch already exists");
        uint256 ts;
        assembly { ts := timestamp() }
        products[batchId] = Product({ batchId: batchId, farmer: farmer, createdAt: ts, exists: true });
        if (metadataHash != bytes32(0)) {
            productMetadataHashes[batchId] = metadataHash;
            emit ProductMetadataAnchored(batchId, metadataHash, ts);
        }
        emit ProductCreated(batchId, farmer, ts);
    }

    function addSupplyChainEvent(string calldata batchId, string calldata eventType, address participant, bytes32 dataHash, string calldata location) external {
        require(products[batchId].exists, "SupplyChain: batch does not exist");
        uint256 ts;
        assembly { ts := timestamp() }
        batchEvents[batchId].push(SupplyChainEvent({
            batchId: batchId, eventType: eventType, participant: participant,
            timestamp: ts, dataHash: dataHash, location: location
        }));
        emit SupplyChainEventAdded(batchId, eventType, participant, ts);
    }

    function addCertificateHash(string calldata batchId, string calldata certificateId, bytes32 certificateHash, address verifier) external {
        require(products[batchId].exists, "SupplyChain: batch does not exist");
        uint256 ts;
        assembly { ts := timestamp() }
        certificates[batchId] = Certificate({
            batchId: batchId, certificateId: certificateId, certificateHash: certificateHash,
            verifier: verifier, timestamp: ts, status: Status.VERIFIED
        });
        emit CertificateHashAdded(batchId, certificateId, certificateHash, verifier);
    }
}
```

### Appendix B: Docker Multi-Stage Container Definition (`Dockerfile`)
```dockerfile
# Multi-stage build for Organic Trace platform
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc g++ make python3 openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY contracts/package.json ./contracts/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN cd contracts && npm install --no-audit --no-fund \
    && cd ../backend && npm install --no-audit --no-fund \
    && cd ../frontend && npm install --no-audit --no-fund
COPY Makefile ./
COPY native ./native
COPY contracts ./contracts
COPY backend ./backend
COPY frontend ./frontend
RUN make clean && make all
RUN cd contracts && npx hardhat compile \
    && cd ../backend && npx prisma generate \
    && cd ../frontend && npm run build
```

### Appendix C: Interface Placeholder Guide
- **Figure A1**: Screenshot of Farmer Dashboard showing verified batch list and QR code modal.
- **Figure A2**: Screenshot of Partner Dashboard appending `RECEIVED_BY_PROCESSOR` event.
- **Figure A3**: Screenshot of Consumer Verification Portal rendering the Merkle proof tree and DAG timeline.
- **Figure A4**: Screenshot of Indian Government Schemes Hub filtered by "Organic Farming" in Hindi.
- **Figure A5**: Screenshot of Live Native SIMD Hardware Benchmark Telemetry Modal.
