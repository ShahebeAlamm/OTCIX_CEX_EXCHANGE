# OTCIX Exchange Backend

A Node.js and Express based crypto swap backend using the binance API.
Users can fetch coins, get live estimates, create swap transactions, and track their status from a single backend.

Project Overview

OTCIX Exchange is a non-custodial CEX-style backend that integrates with ChangeNOW’s centralized API to perform swaps between different cryptocurrencies.

Features
1. Live crypto pair prices (BTC to ETH, etc.)
2. Buy and Sell order creation
3. Transaction status tracking
4. Auto retry and polling system
5. Mock mode for testing (no real funds needed)
6. Secure API key handling using .env

Tech Stack

Backend: Node.js, Express.js
Crypto API: ChangeNOW REST API
Database: SQLite (local logging)
Security: Helmet, Rate Limit, dotenv
Validation: Joi
Testing: Axios test script

Setup and Installation

Step 1. Clone Repository
git clone https://github.com/YOUR_GITHUB_USERNAME/otcix-exchange.git
cd otcix-exchange

Step 2. Install Dependencies
npm install

Step 3. Configure Environment
Create a .env file in the root folder and add the following:
PORT=4000
CHANGENOW_API_KEY=your_changenow_api_key_here
CHANGENOW_BASE=https://api.changenow.io/v2
RATE_CACHE_TTL=30
USE_MOCK_TX=true

Note: 
Set USE_MOCK_TX=true for fake transactions (testing mode)
Set USE_MOCK_TX=false for real ChangeNOW swaps

Run the Server

npm run dev
or
node server.js

The server will start on http://localhost:4000

API Endpoints

GET /api/coins Get all supported coins
GET /api/pairs Get available trading pairs
POST /api/estimate Get estimated exchange amount
POST /api/transaction Create a new crypto swap transaction
GET /api/transaction/:id Check transaction status (real or mock)

Local Testing

To test all routes:
node test.js

The script will:
Fetch supported coins
Fetch live estimate
Create transaction (mock if enabled)
Check transaction status
Log everything in console

Database Info

Transactions are logged inside transactions.db (SQLite)
You can open and check records:
sqlite3 transactions.db
SELECT * FROM transactions;

Folder Structure

otcix-exchange
server.js
db.js
routes/exchange.js
services/changenow.js
utils/cache.js
test.js
package.json
.env
.gitignore
README.md

Project Type

This is not a DEX (Decentralized Exchange)
It is a Non-Custodial CEX-style backend using ChangeNOW’s centralized API

Difference:
DEX means swaps happen on-chain via smart contracts
CEX means swaps go through an exchange API like ChangeNOW

Future Enhancements

1. JWT authentication system
2. Wallet connect integration
3. User transaction dashboard
4. Multi-chain network support
5. On-chain swap (DEX integration)

Author

Developer: Khushi Q
Project: OTCIX Exchange Backend
Year: 2025
GitHub: https://github.com/YOUR_GITHUB_USERNAME

Notes

1. This project is a real crypto swap backend using ChangeNOW API.
2. For testing mode, set USE_MOCK_TX=true in .env.
3. For real swaps, set USE_MOCK_TX=false and use a valid ChangeNOW API key.

Pro Tip:
If the README is missing on GitHub, click Add File and select Create README.md.
GitHub automatically formats markdown cleanly.
