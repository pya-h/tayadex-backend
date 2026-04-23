# Tayaswap Backend

Backend service for Tayaswap, built with Bun, TypeScript, Hono, Prisma, and PostgreSQL.
It provides wallet authentication, quote APIs, user/point/financial stats APIs, and configurable event indexing (direct chain logs or optional GraphQL subgraph).

## 🚀 Features

### Core
- Web3 authentication (nonce + signed message login)
- User profile management (public and private views)
- Referral link support during onboarding/profile update
- Quote engine with route discovery and slippage/price-impact output
- Point history and leaderboard APIs
- Financial stats APIs (global and per-user)
- Task verification endpoint (`/api/tasks/:id`)
- Event indexing into `ProcessedTransaction` + point updates

### Indexing Modes
- **Direct Indexer (default)**: Reads blockchain logs via RPC (`Swap`, `Mint`, `Burn`)
- **GraphQL Indexer (optional)**: Reads indexed events from subgraph and feeds the same DB flow

### Technical
- Bun-first runtime/tooling
- Hono + Chanfana OpenAPI routes
- Prisma ORM with PostgreSQL
- Cron-based background jobs
- Biome formatting/linting

## 🏗️ Architecture
- `controllers`: route handlers and validation schemas
- `services`: business logic, indexing, integrations, DB operations
- `models`: DTO and response schemas
- `middleware`: auth guards
- `utils`: shared helpers (auth, routing math, token math)

## 📡 API Endpoints

### Authentication
- `GET /api/auth/nonce`
- `POST /api/auth/login`

### Trading & Tasks
- `GET /api/quote`
Query params: `fromToken`, `toToken`, and exactly one of `fromAmount`/`toAmount`
- `GET /api/tasks/:id`
Query params: `address`

### Users
- `GET /api/user`
- `GET /api/user/:ident`
(`ident` can be user ID or wallet address)
- `GET /api/user/profile` (auth required)
- `PATCH /api/user/profile` (auth required)
- `GET /api/user/:id/ranking`
- `GET /api/user/:id/points`
- `GET /api/user/:id/financials`

### Points & Stats
- `GET /api/point/leaderboard`
- `GET /api/point/leaderboard/history`
- `GET /api/point/history`
- `GET /api/stats`

## 🛠️ Prerequisites
- Bun `1.3+`
- PostgreSQL
- RPC endpoint (required for direct indexer)
- GraphQL subgraph endpoint (required for quote/task GraphQL queries and GraphQL indexer mode)

## 🚀 Installation & Setup

### 1. Clone
```bash
git clone <repository-url>
cd tayadex-backend
```

### 2. Install
```bash
bun install
```

### 3. Configure Environment
Create `.env` in project root (or copy from `.env.example`):

```env
DATABASE_URL=
PORT=4200

RPC_URL=
GRAPHQL_ENDPOINT=
CHAIN_ID=10143

JWT_SECRET=
JWT_EXPIRY_DAYS=2
JWT_ISSUER=

INDEXER_PROVIDER=direct
INDEXER_INTERVAL=0
GRAPHQL_INDEXER_BATCH_SIZE=1000

PRIMARY_CONTRACT_ADDRESS=
MAX_BATCH_STEPS=
MAX_ROUND_RETRIES=
BATCH_SIZE=
RETRY_DELAY_SEC=
START_BLOCK=
```

### 4. Database
```bash
bunx prisma migrate dev
bunx prisma generate
bun run init
```

### 5. Run
```bash
bun run dev
```

## 🔧 Scripts
- `bun run dev`: start server in watch mode
- `bun run start`: start server
- `bun run build`: build with tsup
- `bun run typecheck`: TypeScript check
- `bun run init`: seed DB
- `bun run format`: Biome format
- `bun run lint`: Biome lint

## ⚙️ Indexer Configuration

### Direct Indexer (default)
```env
INDEXER_PROVIDER=direct
INDEXER_INTERVAL=10
```
Uses RPC logs to index events.

### GraphQL Indexer (optional)
```env
INDEXER_PROVIDER=graphql
INDEXER_INTERVAL=10
GRAPHQL_ENDPOINT=https://your-subgraph-endpoint.com
GRAPHQL_INDEXER_BATCH_SIZE=1000
```
Uses subgraph events and writes into the same `ProcessedTransaction`/point flow.

### Notes
- `INDEXER_INTERVAL=0` disables indexing rounds.
- `INDEXER_INTERVAL` is interpreted in seconds (clamped to `1..59`).
- `CHAIN_ID` should match a row in `Chain` table.

## 📊 Data Model (Current)
Main entities currently used by server flows:
- `User`, `Avatar`
- `ProcessedTransaction`, `Chain`
- `PointSystemRule`, `PointHistory`
- `Referral`, `ReferralRules`

Also modeled and migrated:
- `Milestone`, `AchievedMilestones`

## 🗺️ Feature Plans
- **Milestone Engine**: activate `Milestone`/`AchievedMilestones` models in runtime services.
  - define milestone criteria evaluation (point/transaction/social activity driven)
  - automatic milestone achievement tracking during indexing/activity updates
  - reward issuing flow for milestone completion (points/token rewards based on `rewardType`)
  - user-facing milestone progress and history endpoints
- Referral reward robustness improvements (per-user payment windows, retry safety)
- Supported token modeling for stronger indexing/performance constraints

## 🔍 API Docs
OpenAPI docs are exposed at:
- `GET /api`
