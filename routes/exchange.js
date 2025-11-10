// // routes/exchange.js
// const express = from ("express");
// const axios = require("axios");
// const router = express.Router();
// const cache = require("../utils/cache");
// require("dotenv").config();

// const REAL_MODE = process.env.REAL_MODE === "true";
// const CHANGENOW_API_KEY = process.env.CHANGENOW_API_KEY;
// const BASE_URL = process.env.CHANGENOW_BASE || "https://api.changenow.io/v2";

// // 🪙 GET Coins
// router.get("/coins", async (req, res) => {
//   if (!REAL_MODE) {
//     return res.json([
//       { ticker: "btc", name: "Bitcoin" },
//       { ticker: "eth", name: "Ethereum" },
//       { ticker: "usdt", name: "Tether" },
//     ]);
//   }

//   try {
//     const cached = cache.get("coins");
//     if (cached) return res.json(cached);

//     const { data } = await axios.get(`${BASE_URL}/exchange/currencies`, {
//       params: { active: true },
//     });
//     cache.set("coins", data);
//     res.json(data);
//   } catch (err) {
//     console.error("Error fetching coins:", err.message);
//     res.status(500).json({ error: "Failed to fetch coins" });
//   }
// });

// // 🔗 GET Pairs
// router.get("/pairs", async (req, res) => {
//   if (!REAL_MODE) {
//     return res.json([
//       { from: "btc", to: "eth" },
//       { from: "eth", to: "usdt" },
//     ]);
//   }

//   try {
//     const cached = cache.get("pairs");
//     if (cached) return res.json(cached);

//     const { data } = await axios.get(`${BASE_URL}/exchange/currencies/pairs`);
//     cache.set("pairs", data);
//     res.json(data);
//   } catch (err) {
//     console.error("Error fetching pairs:", err.message);
//     res.status(500).json({ error: "Failed to fetch pairs" });
//   }
// });

// // 💰 POST Estimate
// router.post("/estimate", async (req, res) => {
//   const { from, to, amount } = req.body;

//   if (!REAL_MODE) {
//     return res.json({
//       fromCurrency: from,
//       toCurrency: to,
//       amount,
//       estimatedAmount: (amount * 0.95).toFixed(6),
//       rate: (0.95).toFixed(4),
//       note: "🧪 Dummy estimate (testing mode)",
//     });
//   }

//   try {
//     const { data } = await axios.get(`${BASE_URL}/exchange/estimated-amount`, {
//       params: {
//         fromCurrency: from,
//         toCurrency: to,
//         fromAmount: amount,
//         api_key: CHANGENOW_API_KEY,
//       },
//     });
//     res.json(data);
//   } catch (err) {
//     console.error("Estimate error:", err.message);
//     res.status(500).json({ error: "Failed to estimate exchange" });
//   }
// });

// // 💸 POST Transaction
// router.post("/transaction", async (req, res) => {
//   const { from, to, amount, destinationAddress, refundAddress } = req.body;

//   if (!REAL_MODE) {
//     return res.json({
//       id: "test_tx_123",
//       from,
//       to,
//       amount,
//       destinationAddress,
//       status: "waiting",
//       note: "🧪 Dummy transaction (testing mode)",
//     });
//   }

//   try {
//     const { data } = await axios.post(`${BASE_URL}/exchange`, {
//       fromCurrency: from,
//       toCurrency: to,
//       fromAmount: amount,
//       address: destinationAddress,
//       refundAddress,
//       api_key: CHANGENOW_API_KEY,
//     });
//     res.json(data);
//   } catch (err) {
//     console.error("Transaction error:", err.message);
//     res.status(500).json({ error: "Failed to create transaction" });
//   }
// });

// // 🔍 GET Transaction Status
// router.get("/transaction/:id", async (req, res) => {
//   const { id } = req.params;

//   if (!REAL_MODE) {
//     return res.json({
//       id,
//       status: "waiting",
//       message: "🧪 Dummy transaction status (testing mode)",
//     });
//   }

//   try {
//     const { data } = await axios.get(`${BASE_URL}/exchange/by-id`, {
//       params: { id, api_key: CHANGENOW_API_KEY },
//     });
//     res.json(data);
//   } catch (err) {
//     console.error("Transaction status error:", err.message);
//     res.status(500).json({ error: "Failed to fetch transaction status" });
//   }
// });

// module.exports = router;
