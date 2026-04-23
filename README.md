# Tayaswap Backend

A comprehensive backend service for the Tayaswap decentralized exchange platform, built with Bun, TypeScript, and Hono framework. This service provides Web3 authentication, trading quotes, user management, point systems, and blockchain event indexing.

## 🚀 Features

### Core Functionality
- **Web3 Authentication**: Secure wallet-based login using Ethereum signatures
- **Trading Quotes**: Real-time token swap quotes with optimal routing
- **User Management**: Complete user profiles, referral systems, and avatar management
- **Point System**: Gamified reward system for user activities
- **Blockchain Integration**: Event indexing and transaction processing
- **Caching System**: Redis-based caching for improved performance
- **GraphQL Integration**: Subgraph queries for blockchain data

### Technical Features
- **TypeScript**: Full type safety and modern JavaScript features
- **Hono Framework**: Fast, lightweight web framework
- **Prisma ORM**: Type-safe database operations with PostgreSQL
- **OpenAPI**: Auto-generated API documentation
- **JWT Authentication**: Secure token-based authentication
- **Cron Jobs**: Automated background tasks and cleanup
- **Biome**: Fast code formatting and linting

## 🏗️ Architecture

The project follows a clean architecture pattern with:
- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and external integrations
- **Models**: Data structures and validation schemas
- **Middleware**: Authentication and request processing
- **Utils**: Helper functions and utilities

## 📡 API Endpoints

### Authentication
- `GET /api/auth/nonce` - Get authentication nonce for Web3 login
- `POST /api/auth/login` - Authenticate with wallet signature

### Users
- `GET /api/user` - Get all users (with pagination)
- `GET /api/user/:id` - Get user by ID or wallet address
- `GET /api/user/profile` - Get authenticated user profile (protected)
- `PATCH /api/user/profile` - Update user profile (protected)

### Points & Rewards
- `GET /api/point` - Get point leaderboard
- `GET /api/point/history` - Get point history for all users
- `GET /api/user/:id/point` - Get specific user's points
- `GET /api/user/:id/point/history` - Get specific user's point history

### Trading
- `GET /api/quote` - Get trading quote and optimal route
  - Query params: `fromToken`, `toToken`, `fromAmount`/`toAmount`

* Warning: Do not use with Monad Testnet

### Tasks & Verification
- `GET /api/tasks/:id` - Verify task completion for a user
  - Query params: `address` (user wallet address)

* Warning: Do not use with Monad Testnet

## 🛠️ Prerequisites

- **Bun** 1.3+
- **PostgreSQL** database
- **Redis** (optional, for caching)
- **Ethereum RPC** endpoint
- **GraphQL Subgraph** endpoint

## 🚀 Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd tayadex
```

### 2. Install dependencies
```bash
bun install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/tayadex"

# Server
PORT=4200

# Blockchain
GRAPHQL_ENDPOINT="https://your-subgraph-endpoint.com"  # not important since monad testnet doesn't stand well with graphql
RPC_URL="https://your-ethereum-rpc.com"
CHAIN_ID=10143
# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRY_DAYS=2
JWT_ISSUER='your-issuer'
```

### 4. Database Setup
```bash
# Run database migrations (dev arg is optional)
bunx prisma migrate [dev]
# Generate types
bunx prisma generate

# Seed the database (optional)
bun run init
```

### 5. Start the server
```bash
# Development mode with hot reload
bun run dev

# Production mode
bun run start

# Build for production
bun run build
```

## 📊 Database Schema

The application uses PostgreSQL with the following main entities:

- **User**: User profiles, wallet addresses, referral codes
- **ProcessedTransaction**: Blockchain transactions with metadata
- **PointHistory**: User point accumulation and spending
- **PointSystemRule**: Rules for point distribution
- **Referral**: User referral relationships
- **Chain**: Supported blockchain networks

## 🔧 Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run start` - Start production server
- `bun run build` - Build TypeScript to JavaScript
- `bun run typecheck` - Run TypeScript type checks
- `bun run init` - Initialize database with seed data
- `bun run format` - Format code using Biome
- `bun run lint` - Lint code using Biome

### Background Services
The application includes several background services:
- **Event Indexer**: Runs every 10 seconds to process blockchain events
- **Cache Cleanup**: Runs every 5 minutes to clean expired cache entries

### Optional GraphQL Indexer
By default, the server uses the direct blockchain indexer (`INDEXER_PROVIDER=direct`).
If your chain has a reliable subgraph and you want to index from GraphQL instead:

1. Set these env vars:
```env
INDEXER_PROVIDER=graphql
INDEXER_INTERVAL=10
GRAPHQL_ENDPOINT="https://your-subgraph-endpoint.com"
# optional tuning (defaults to 1000)
GRAPHQL_INDEXER_BATCH_SIZE=1000
```
2. Keep `CHAIN_ID` aligned with a row in the `Chain` table.
3. Start the server normally (`bun run dev` / `bun run start`).

The GraphQL indexer writes into the same `ProcessedTransaction` and point flow, so existing endpoints continue to work without extra API-layer changes.

## 🔐 Authentication Flow

1. **Get Nonce**: User requests authentication nonce for their wallet address
2. **Sign Message**: User signs the authentication message with their private key
3. **Login**: User submits signature for verification and receives JWT token
4. **Protected Routes**: Include JWT token in Authorization header

## 📈 Point System

The point system rewards users for various activities:
- **Trading**: Points based on swap volume and frequency
- **Referrals**: Bonus points for bringing new users
- **Events**: Special point multipliers for specific events
- **Rules**: Configurable point distribution rules

## 🔍 API Documentation

The API includes OpenAPI documentation that can be accessed at runtime. All endpoints are documented with:
- Request/response schemas
- Parameter validation
- Error handling
- Example requests
