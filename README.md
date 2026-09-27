# Organic Trace — Blockchain-Based Organic Farming Traceability (MVP)

A minimal, runnable slice of the full Blockchain-Based Organic Farming Traceability and Supply
Chain Transparency Platform. This MVP implements exactly the essential end-to-end flow:

1. Register / log in (Farmer or Supply Chain Partner)
2. Farmer creates a product batch → saved to PostgreSQL → recorded on a local blockchain
3. Partner (processor/distributor/retailer, combined into one role for this MVP) adds
   supply-chain events → saved to PostgreSQL → recorded on-chain
4. Farmer uploads a certificate → SHA-256 hash recorded on-chain, verifiable later
5. QR code generated for each batch, downloadable as PNG
6. Anyone scanning the QR / opening `/trace/:batchId` sees the full public traceability
   timeline, with blockchain transaction hashes — **no login required**

Advanced features from the full spec (separate Processor/Distributor/Retailer/Certifier/Admin
roles, admin dashboard, rate-limited certificate workflows, etc.) are intentionally left out of
this MVP so the essential flow is easy to run, demo, and extend.

## Architecture

```
frontend (React + Vite + Tailwind)  →  backend (Express + Prisma)  →  PostgreSQL
                                              ↓
                                    ethers.js  →  Hardhat local blockchain
                                                   (SupplyChain.sol)
```

The blockchain stores only: batch IDs, event metadata, timestamps, participant addresses, and
cryptographic hashes. Documents, images, and personal data stay in PostgreSQL.

**Blockchain provides a tamper-evident and auditable record of submitted and verified
supply-chain information. Physical product authenticity still depends on trusted participants,
certification authorities, inspections, and other verification mechanisms.**

## Project Structure

```
organic-trace/
  backend/        Express API + Prisma schema
  contracts/      Hardhat project + SupplyChain.sol + tests
  frontend/       React + Vite + Tailwind app
  docker-compose.yml   PostgreSQL container
  .env.example         shared backend/blockchain env vars
```

## Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for PostgreSQL) — or a local PostgreSQL install
- Windows PowerShell (all commands below use PowerShell syntax)
- Python 3.8+ (optional, for run.py)

---

## 🚀 One-Click Quick Start (Windows / All Platforms)

You can run the entire platform (Postgres, Hardhat blockchain node, contract deployment, backend API, frontend UI, and open browser) in **one single command or double click**:

### Windows (One Click):
- **Double click `run.bat`** (or run `.\run.bat` in CMD / PowerShell)
- To stop everything cleanly: **Double click `stop.bat`**

### Cross-Platform Python Orchestrator:
```bash
python run.py             # Start entire stack, deploy contracts, open browser
python run.py --status    # Check status of all ports & services
python run.py --stop      # Stop all services and free ports
python run.py --test      # Run smart contract tests
python run.py --seed      # Re-seed database with demo users
```

---

## 1. Manual Step-by-Step Setup

Open PowerShell in the project root (`organic-trace/`) and install each part:

```powershell
cd backend
npm install
cd ..\contracts
npm install
cd ..\frontend
npm install
cd ..
```

## 2. Environment Configuration

```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env
```

The default `.env` values work out of the box for local development (they use Hardhat's
well-known local test account — never use this key on a real network).

## 3. Database

Start PostgreSQL with Docker Compose:

```powershell
docker compose up -d
```

Run the Prisma migration to create tables:

```powershell
cd backend
npx prisma migrate dev --name init
cd ..
```

## 4. Blockchain

**Terminal 1** — start the local Hardhat blockchain (keep this running):

```powershell
cd contracts
npx hardhat node
```

**Terminal 2** — compile and deploy the contract (this writes `CONTRACT_ADDRESS` into the root
`.env` automatically):

```powershell
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

Copy the ABI so the backend can find it (already included by default once compiled — no action
needed, the backend reads `contracts/artifacts/...` directly).

## 5. Backend

**Terminal 3**:

```powershell
cd backend
npm run seed      # creates demo users + one sample batch
npm run dev        # starts on http://localhost:5000
```

## 6. Frontend

**Terminal 4**:

```powershell
cd frontend
npm run dev        # starts on http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## Demo Credentials

Password for all seeded accounts: `Demo@1234`

| Role    | Email                |
|---------|-----------------------|
| Farmer  | farmer@example.com    |
| Partner | partner@example.com   |
| Admin   | admin@example.com (not yet wired to a dashboard in this MVP) |

## Demo Workflow

1. Log in as `farmer@example.com`.
2. Go to **Farmer Dashboard → + Create Batch**, fill in the form, submit.
   The batch is saved to Postgres and a `createProduct` transaction is sent to the local chain.
3. Open the batch — download the QR code, note the transaction hash shown for "Batch Created".
4. Log out, log in as `partner@example.com`.
5. Open the same batch (via **Partner Dashboard → All Batches**), add an event
   (e.g. "Received by Processor"), submit. Repeat for a couple more events
   (e.g. "Dispatched", "Received by Retailer").
6. Open the batch's public trace page: `http://localhost:5173/trace/ORG-BAS-001`
   (or scan the downloaded QR code with your phone, if your phone can reach your dev machine on
   the same network — otherwise just open the link).
7. You'll see the full timeline with blockchain confirmation status for every step.
8. Back on the Farmer Dashboard, upload any file as a "certificate" — its SHA-256 hash gets
   written on-chain. You can later re-upload the same file to `/api/batches/:batchId/certificate/verify`
   to confirm the hash matches.

## API Overview

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

POST /api/batches                              (FARMER)
GET  /api/batches
GET  /api/batches/:batchId
POST /api/batches/:batchId/certificate          (FARMER)
POST /api/batches/:batchId/certificate/verify    (public)

POST /api/batches/:batchId/events               (PARTNER/FARMER/ADMIN)
GET  /api/batches/:batchId/events

GET  /api/trace/:batchId                        (public — QR destination)
```

## Testing

Smart contract tests (product creation, duplicate prevention, event recording, certificate
hashing, unauthorized/non-existent batch handling):

```powershell
cd contracts
npx hardhat test
```

## Security Notes

- Passwords hashed with bcrypt; never stored in plaintext.
- JWT-based auth with role checks on every protected route.
- The blockchain never stores documents, passwords, or personal data — only IDs, hashes, and
  timestamps.
- `.env` is git-ignored; the private key in `.env.example` is Hardhat's public, well-known local
  test account and must never be used on a real network.
- Rate limiting and Helmet security headers are enabled on the API.

## Limitations (MVP scope)

- Roles are simplified to `FARMER`, `PARTNER` (covers processor/distributor/retailer), and
  `ADMIN` (not yet wired to a dashboard).
- No dedicated Certifier workflow yet — certificate hashing is done directly by the farmer.
- No admin dashboard UI yet.
- Blockchain calls are synchronous and simple; production would want a job queue and retry logic
  for chain submissions.

## Future Scope

Split `PARTNER` into distinct Processor / Distributor / Retailer roles, add the Certifier
workflow and Admin dashboard from the full specification, add batch photo/document storage,
and support deployment to a public testnet.'



##run
Terminal 1 — Postgres
powershell
docker compose up -d



Terminal 2 — Hardhat blockchain (leave running)
powershell
cd contracts
npx hardhat node

Terminal 3 — Deploy contract, then start backend
powershell
cd contracts
npx hardhat run scripts/deploy.js --network localhost
cd ..
cd backend
npm run dev


Terminal 4 — Frontend
powershell
cd frontend
npm run dev
