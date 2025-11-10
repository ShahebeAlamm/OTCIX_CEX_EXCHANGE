
// // server.js
// const express = require("express");
// const bodyParser = require("body-parser");
// const fs = require("fs");
// const path = require("path");
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcryptjs");
// require("dotenv").config();

// const binance = require("./binanceService");

// const app = express();
// app.use(bodyParser.json());
// app.use(express.static(__dirname)); // serves index.html

// const PORT = process.env.PORT || 3000;
// const JWT_SECRET = process.env.JWT_SECRET || "change_this_jwt_secret";
// const USERS_FILE = path.join(__dirname, "users.json");

// // simple logger
// function log(...args) {
//   console.log(...args);
//   try { fs.appendFileSync(path.join(__dirname, "server.log"), `[${new Date().toISOString()}] ${JSON.stringify(args)}\n`); } catch (e) {}
// }

// // users helpers
// function readUsers() {
//   try {
//     const raw = fs.readFileSync(USERS_FILE, "utf8");
//     return JSON.parse(raw || "[]");
//   } catch { return []; }
// }
// function writeUsers(users) {
//   fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
// }

// // JWT helpers
// function signToken(payload) {
//   return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
// }
// function verifyToken(req, res, next) {
//   const auth = req.headers.authorization;
//   if (!auth) return res.status(401).json({ error: "Authorization header required" });
//   const token = auth.split(" ")[1];
//   try {
//     const data = jwt.verify(token, JWT_SECRET);
//     req.user = data;
//     next();
//   } catch (err) {
//     return res.status(403).json({ error: "Invalid token" });
//   }
// }

// // sync server time on startup
// (async () => {
//   try {
//     await binance.syncServerTime();
//     log("Binance server time synced.");
//   } catch (err) {
//     log("Warning: could not sync server time:", err.message || err);
//   }
// })();

// // ----------------- Auth routes -----------------
// app.post("/api/signup", async (req, res) => {
//   const { username, password } = req.body;
//   if (!username || !password) return res.status(400).json({ error: "username & password required" });
//   const users = readUsers();
//   if (users.find(u => u.username === username)) return res.status(409).json({ error: "user exists" });
//   const hash = await bcrypt.hash(password, 10);
//   users.push({ username, password: hash });
//   writeUsers(users);
//   res.json({ ok: true, message: "user created" });
// });

// app.post("/api/login", async (req, res) => {
//   const { username, password } = req.body;
//   if (!username || !password) return res.status(400).json({ error: "username & password required" });
//   const users = readUsers();
//   const user = users.find(u => u.username === username);
//   if (!user) return res.status(401).json({ error: "invalid credentials" });
//   const ok = await bcrypt.compare(password, user.password);
//   if (!ok) return res.status(401).json({ error: "invalid credentials" });
//   const token = signToken({ username });
//   res.json({ token });
// });

// // -------------- Price & Estimate --------------
// app.get("/api/price/:symbol", async (req, res) => {
//   try {
//     const { symbol } = req.params;
//     const p = await binance.getPrice(symbol);
//     res.json({ symbol: p.symbol, price: parseFloat(p.price) });
//   } catch (err) {
//     log("price error:", err.message || err.response?.data);
//     res.status(400).json({ error: err.response?.data || err.message });
//   }
// });

// app.post("/api/estimate", async (req, res) => {
//   try {
//     const { from, to, amount } = req.body;
//     if (!from || !to || amount === undefined) return res.status(400).json({ error: "from,to,amount required" });

//     const pair = `${from}${to}`.toUpperCase();
//     // check symbol exist; if not check reversed pair
//     const symInfo = await binance.getSymbolInfo(pair);
//     if (!symInfo) {
//       const rev = `${to}${from}`.toUpperCase();
//       const revInfo = await binance.getSymbolInfo(rev);
//       if (!revInfo) return res.status(400).json({ error: "pair not supported on Binance" });
//       // price from rev: amount / price
//       const priceRev = parseFloat((await binance.getPrice(rev)).price);
//       const estimated = Number((amount / priceRev).toFixed(8));
//       return res.json({ from, to, amount, rate: 1 / priceRev, estimated, reversed: true, pair: rev });
//     }

//     const priceObj = await binance.getPrice(pair);
//     const rate = parseFloat(priceObj.price);
//     const estimated = Number((amount * rate).toFixed(8));
//     res.json({ from, to, amount, rate, estimated, pair });
//   } catch (err) {
//     log("estimate err:", err.response?.data || err.message || err);
//     res.status(500).json({ error: err.response?.data || err.message });
//   }
// });

// // -------------- Order placement (REAL/Test) --------------
// /*
// Body: { symbol: "ETHBTC", side: "BUY"|"SELL", type: "MARKET"|"LIMIT", quantity: "0.001", price? }
// Protected: requires JWT token from /api/login
// */
// app.post("/api/order", verifyToken, async (req, res) => {
//   try {
//     let { symbol, side, type, quantity, price } = req.body;
//     if (!symbol || !side || !type || !quantity) return res.status(400).json({ error: "symbol,side,type,quantity required" });
//     symbol = symbol.toUpperCase();
//     side = side.toUpperCase();
//     type = type.toUpperCase();

//     // sync server time just before signed request
//     await binance.syncServerTime();

//     // validate symbol and filters
//     const sym = await binance.getSymbolInfo(symbol);
//     if (!sym) return res.status(400).json({ error: "Symbol not supported on Binance" });

//     const lot = sym.filters.find(f => f.filterType === "LOT_SIZE");
//     const minNotional = sym.filters.find(f => f.filterType === "MIN_NOTIONAL");

//     const step = lot ? lot.stepSize : "0.00000001";
//     const minQty = lot ? parseFloat(lot.minQty) : 0.00000001;

//     let qtyNum = parseFloat(quantity);
//     if (isNaN(qtyNum) || qtyNum < minQty) return res.status(400).json({ error: `Quantity too small. Min qty: ${minQty}` });

//     const adjQty = binance.adjustQuantityToStep(qtyNum, step);
//     if (adjQty <= 0) return res.status(400).json({ error: "quantity becomes 0 after step adjustment" });

//     // need price to compute notional for minNotional check
//     let usedPrice = price ? parseFloat(price) : null;
//     if (!usedPrice) {
//       // for MARKET orders get ticker price
//       const pObj = await binance.getPrice(symbol);
//       usedPrice = parseFloat(pObj.price);
//     }
//     if (minNotional) {
//       const minNot = parseFloat(minNotional.minNotional);
//       const notional = usedPrice * adjQty;
//       if (notional < minNot) return res.status(400).json({ error: `Order notional too small. Min notional: ${minNot}` });
//     }

//     const params = { symbol, side, type, quantity: adjQty.toString() };
//     if (type === "LIMIT") { params.price = String(price); params.timeInForce = "GTC"; }

//     const result = await binance.placeOrder(params);

//     // Binance /order/test returns {} — provide a friendly simulated response
//     if (!binance.IS_REAL && result && Object.keys(result).length === 0) {
//       const sim = { simulated: true, id: `sim_${Date.now()}`, symbol, side, type, quantity: params.quantity, status: "TEST_ACCEPTED" };
//       log("SIM ORDER:", sim);
//       return res.json(sim);
//     }

//     log("ORDER RESULT:", result);
//     res.json(result);
//   } catch (err) {
//     log("order err:", err.response?.data || err.message || err);
//     res.status(500).json({ error: err.response?.data || err.message });
//   }
// });

// // -------------- Order status --------------
// app.get("/api/order/status", verifyToken, async (req, res) => {
//   try {
//     const { symbol, orderId } = req.query;
//     if (!symbol || !orderId) return res.status(400).json({ error: "symbol & orderId required" });
//     await binance.syncServerTime();
//     const data = await binance.getOrderStatus(symbol, orderId);
//     res.json(data);
//   } catch (err) {
//     log("order status err:", err.response?.data || err.message || err);
//     res.status(500).json({ error: err.response?.data || err.message });
//   }
// });

// // -------------- Account balances (real only) --------------
// app.get("/api/account", verifyToken, async (req, res) => {
//   try {
//     if (!binance.IS_REAL) return res.status(403).json({ error: "Account endpoint disabled in test mode" });
//     await binance.syncServerTime();
//     const data = await binance.getAccount();
//     res.json(data);
//   } catch (err) {
//     log("account err:", err.response?.data || err.message || err);
//     res.status(500).json({ error: err.response?.data || err.message });
//   }
// });

// // Serve UI
// app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// app.listen(PORT, () => log(`Server listening http://localhost:${PORT} — BINANCE_REAL=${binance.IS_REAL}`));





/////////////////////////////////////////////////////////////////////////////////////////////////////////////





// // server.js
// const express = require("express");
// const bodyParser = require("body-parser");
// const fs = require("fs");
// const path = require("path");
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcryptjs");
// const axios = require("axios");
// require("dotenv").config();

// const binance = require("./binanceService");

// const app = express();
// app.use(bodyParser.json());
// app.use(express.static(__dirname)); // serve index.html from root

// const PORT = process.env.PORT || 3000;
// const JWT_SECRET = process.env.JWT_SECRET || "change_this_jwt_secret";
// const USERS_FILE = path.join(__dirname, "users.json");
// const LOG_FILE = path.join(__dirname, "server.log");

// function log(...args) {
//   const line = `[${new Date().toISOString()}] ${args
//     .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
//     .join(" ")}`;
//   console.log(line);
//   try {
//     fs.appendFileSync(LOG_FILE, line + "\n");
//   } catch {}
// }

// function readUsers() {
//   try {
//     return JSON.parse(fs.readFileSync(USERS_FILE, "utf8") || "{}");
//   } catch {
//     return {};
//   }
// }
// function writeUsers(users) {
//   fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
// }

// function signToken(payload) {
//   return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
// }
// function verifyToken(req, res, next) {
//   const auth = req.headers.authorization;
//   if (!auth)
//     return res.status(401).json({ error: "Authorization header required" });
//   const token = auth.split(" ")[1];
//   try {
//     const data = jwt.verify(token, JWT_SECRET);
//     req.user = data;
//     next();
//   } catch (err) {
//     return res.status(403).json({ error: "Invalid token" });
//   }
// }

// // startup sync
// (async () => {
//   try {
//     await binance.syncServerTime();
//     log("Binance time synced");
//   } catch (e) {
//     log("time sync failed", e.message || e);
//   }
// })();

// // AUTH
// app.post("/api/signup", async (req, res) => {
//   const { username, password } = req.body;
//   if (!username || !password)
//     return res.status(400).json({ error: "username & password required" });
//   const users = readUsers();
//   if (users[username])
//     return res.status(409).json({ error: "user exists" });
//   const hash = await bcrypt.hash(password, 10);
//   users[username] = { password: hash };
//   writeUsers(users);
//   res.json({ ok: true });
// });

// app.post("/api/login", async (req, res) => {
//   const { username, password } = req.body;
//   if (!username || !password)
//     return res.status(400).json({ error: "username & password required" });
//   const users = readUsers();
//   const user = users[username];
//   if (!user) return res.status(401).json({ error: "invalid credentials" });
//   const ok = await bcrypt.compare(password, user.password);
//   if (!ok) return res.status(401).json({ error: "invalid credentials" });
//   const token = signToken({ username });
//   res.json({ token });
// });

// // Suggestions
// app.get("/api/suggestions", async (req, res) => {
//   try {
//     const q = (req.query.q || "").toUpperCase();
//     if (!q) return res.json([]);
//     const info = await binance.getExchangeInfo();
//     const matches = info.symbols
//       .map((s) => s.baseAsset)
//       .filter((v, i, a) => v.includes(q) && a.indexOf(v) === i)
//       .slice(0, 60);
//     const quotes = info.symbols
//       .map((s) => s.quoteAsset)
//       .filter((v, i, a) => v.includes(q) && a.indexOf(v) === i)
//       .slice(0, 60);
//     res.json([...matches, ...quotes].slice(0, 60));
//   } catch (err) {
//     log("suggestions err", err.message || err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Price endpoint
// app.get("/api/price/:symbol", async (req, res) => {
//   try {
//     const sym = req.params.symbol.toUpperCase();
//     const p = await binance.getPrice(sym);
//     res.json({ symbol: p.symbol, price: parseFloat(p.price) });
//   } catch (err) {
//     log("price err", err.message || (err.response && err.response.data));
//     res.status(400).json({ error: err.response?.data || err.message });
//   }
// });

// // Estimate route
// app.post("/api/estimate", async (req, res) => {
//   try {
//     const { from, to, amount } = req.body;
//     if (!from || !to || amount === undefined)
//       return res
//         .status(400)
//         .json({ error: "from,to,amount required" });

//     const pair = `${from}${to}`.toUpperCase();
//     const symInfo = await binance.getSymbolInfo(pair);
//     if (!symInfo) {
//       const rev = `${to}${from}`.toUpperCase();
//       const revInfo = await binance.getSymbolInfo(rev);
//       if (!revInfo)
//         return res
//           .status(400)
//           .json({ error: "pair not supported on Binance" });
//       const priceRev = parseFloat((await binance.getPrice(rev)).price);
//       const estimated = Number((amount / priceRev).toFixed(8));
//       return res.json({
//         from,
//         to,
//         amount,
//         rate: 1 / priceRev,
//         estimated,
//         reversed: true,
//         pair: rev,
//       });
//     }
//     const priceObj = await binance.getPrice(pair);
//     const rate = parseFloat(priceObj.price);
//     const estimated = Number((amount * rate).toFixed(8));
//     res.json({ from, to, amount, rate, estimated, pair });
//   } catch (err) {
//     log("estimate err", err.message || err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // ✅ FIXED ORDER (main swap)
// app.post("/api/order", verifyToken, async (req, res) => {
//   try {
//     let { symbol, side, type, quantity, price } = req.body;
//     if (!symbol || !side || !type || !quantity)
//       return res.status(400).json({
//         error: "symbol,side,type,quantity required",
//       });

//     symbol = symbol.toUpperCase();
//     side = side.toUpperCase();
//     type = type.toUpperCase();

//     await binance.syncServerTime();

//     // validate symbol
//     const sym = await binance.getSymbolInfo(symbol);
//     if (!sym)
//       return res.status(400).json({
//         error: "Symbol not supported on Binance",
//       });

//     // ✅ Quantity validation fix (direct Binance API)
//     const exInfo = await axios.get(
//       `https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}`
//     );
//     const lot = exInfo.data.symbols[0].filters.find(
//       (f) => f.filterType === "LOT_SIZE"
//     );
//     const minQty = parseFloat(lot.minQty);
//     const stepSize = parseFloat(lot.stepSize);

//     let adjQtyNum = Math.max(parseFloat(quantity), minQty);
//     adjQtyNum = Math.floor(adjQtyNum / stepSize) * stepSize;
//     const adjQtyStr = adjQtyNum
//       .toFixed(8)
//       .replace(/\.?0+$/, "");

//     const priceObj = await binance.getPrice(symbol);
//     const usedPrice = parseFloat(priceObj.price);

//     const minNotional = sym.filters.find(
//       (f) => f.filterType === "MIN_NOTIONAL"
//     );
//     if (minNotional) {
//       const minNot = parseFloat(minNotional.minNotional);
//       const notional = usedPrice * adjQtyNum;
//       if (notional < minNot)
//         return res.status(400).json({
//           error: `Order notional too small. Min notional: ${minNot}`,
//         });
//     }

//     const finalParams = { symbol, side, type, quantity: adjQtyStr };
//     if (type === "LIMIT") {
//       finalParams.price = String(price);
//       finalParams.timeInForce = "GTC";
//     }

//     // Safety check
//     const enableFile = path.join(__dirname, "ENABLE_REAL");
//     const envReal = process.env.BINANCE_REAL === "true";
//     const enableFileExists =
//       fs.existsSync(enableFile) &&
//       fs.readFileSync(enableFile, "utf8").trim() === "ENABLE";
//     const realAllowed = envReal && enableFileExists;

//     log("ORDER_REQUEST", {
//       user: req.user.username,
//       finalParams,
//       envReal,
//       enableFileExists,
//     });

//     if (!realAllowed) {
//       return res.json({
//         simulated: true,
//         message:
//           "Real trading not enabled. To enable: set BINANCE_REAL=true in .env AND create ENABLE_REAL file with text ENABLE",
//         params: finalParams,
//       });
//     }

//     const result = await binance.placeOrder(finalParams, true);
//     log("ORDER_RESULT", result);
//     res.json(result);
//   } catch (err) {
//     log("order err", err.response?.data || err.message || err);
//     res
//       .status(500)
//       .json({ error: err.response?.data || err.message });
//   }
// });

// // account/status routes same as before
// app.get("/api/order/status", verifyToken, async (req, res) => {
//   try {
//     const { symbol, orderId } = req.query;
//     if (!symbol || !orderId)
//       return res.status(400).json({
//         error: "symbol & orderId required",
//       });
//     await binance.syncServerTime();
//     const data = await binance.getOrderStatus(symbol, orderId);
//     res.json(data);
//   } catch (err) {
//     log("order status err", err.message || err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.get("/api/account", verifyToken, async (req, res) => {
//   try {
//     await binance.syncServerTime();
//     const data = await binance.getAccount();
//     res.json(data);
//   } catch (err) {
//     log("account err", err.message || err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // serve frontend
// app.get("/", (req, res) =>
//   res.sendFile(path.join(__dirname, "index.html"))
// );

// app.listen(PORT, () =>
//   log(
//     `Server listening http://localhost:${PORT} — BINANCE_REAL=${process.env.BINANCE_REAL}`
//   )
// );








////////////////////////////////////////////////////////////////////////////////////////////////////////////////








// server.js
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
require("dotenv").config();

const binance = require("./binanceService");

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname)); // serve index.html

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_jwt_secret";
const USERS_FILE = path.join(__dirname, "users.json");
const LOG_FILE = path.join(__dirname, "server.log");

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args
    .map(a => (typeof a === "object" ? JSON.stringify(a) : String(a)))
    .join(" ")}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {}
}

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8") || "{}");
  } catch {
    return {};
  }
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Authorization header required" });
  const token = auth.split(" ")[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

// Startup: sync Binance time
(async () => {
  try {
    await binance.syncServerTime();
    log("Binance time synced");
  } catch (e) {
    log("time sync failed", e.message || e);
  }
})();

// AUTH
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "username & password required" });
  const users = readUsers();
  if (users[username]) return res.status(409).json({ error: "user exists" });
  const hash = await bcrypt.hash(password, 10);
  users[username] = { password: hash };
  writeUsers(users);
  res.json({ ok: true });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "username & password required" });
  const users = readUsers();
  const user = users[username];
  if (!user) return res.status(401).json({ error: "invalid credentials" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });
  const token = signToken({ username });
  res.json({ token });
});

// ✅ New API: fetch Binance pair info (live limits)
app.get("/api/pair-info/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const response = await axios.get(
      `https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}`
    );
    const data = response.data.symbols?.[0];
    if (!data) return res.status(404).json({ error: "Symbol not found on Binance" });

    const priceFilter = data.filters.find(f => f.filterType === "PRICE_FILTER");
    const lotSize = data.filters.find(f => f.filterType === "LOT_SIZE");
    const notional = data.filters.find(f => f.filterType === "MIN_NOTIONAL");

    res.json({
      symbol,
      baseAsset: data.baseAsset,
      quoteAsset: data.quoteAsset,
      minPrice: priceFilter?.minPrice,
      minQty: lotSize?.minQty,
      minNotional: notional?.minNotional,
    });
  } catch (err) {
    console.error("Pair info error:", err.message);
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

// Suggestions
app.get("/api/suggestions", async (req, res) => {
  try {
    const q = (req.query.q || "").toUpperCase();
    if (!q) return res.json([]);
    const info = await binance.getExchangeInfo();
    const matches = info.symbols
      .map(s => s.baseAsset)
      .filter((v, i, a) => v.includes(q) && a.indexOf(v) === i)
      .slice(0, 60);
    const quotes = info.symbols
      .map(s => s.quoteAsset)
      .filter((v, i, a) => v.includes(q) && a.indexOf(v) === i)
      .slice(0, 60);
    const out = [...matches, ...quotes].slice(0, 60);
    res.json(out);
  } catch (err) {
    log("suggestions err", err.message || err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Price
app.get("/api/price/:symbol", async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const p = await binance.getPrice(sym);
    res.json({ symbol: p.symbol, price: parseFloat(p.price) });
  } catch (err) {
    log("price err", err.message || err.response?.data);
    res.status(400).json({ error: err.response?.data || err.message });
  }
});

// Estimate
app.post("/api/estimate", async (req, res) => {
  try {
    const { from, to, amount } = req.body;
    if (!from || !to || amount === undefined)
      return res.status(400).json({ error: "from,to,amount required" });

    const pair = `${from}${to}`.toUpperCase();
    const symInfo = await binance.getSymbolInfo(pair);
    if (!symInfo) {
      const rev = `${to}${from}`.toUpperCase();
      const revInfo = await binance.getSymbolInfo(rev);
      if (!revInfo)
        return res.status(400).json({ error: "pair not supported on Binance" });
      const priceRev = parseFloat((await binance.getPrice(rev)).price);
      const estimated = Number((amount / priceRev).toFixed(8));
      return res.json({
        from,
        to,
        amount,
        rate: 1 / priceRev,
        estimated,
        reversed: true,
        pair: rev,
      });
    }
    const priceObj = await binance.getPrice(pair);
    const rate = parseFloat(priceObj.price);
    const estimated = Number((amount * rate).toFixed(8));
    res.json({ from, to, amount, rate, estimated, pair });
  } catch (err) {
    log("estimate err", err.message || err.response?.data || err);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Order
app.post("/api/order", verifyToken, async (req, res) => {
  try {
    let { symbol, side, type, quantity, price } = req.body;
    if (!symbol || !side || !type || !quantity)
      return res.status(400).json({ error: "symbol,side,type,quantity required" });

    symbol = symbol.toUpperCase();
    side = side.toUpperCase();
    type = type.toUpperCase();

    await binance.syncServerTime();

    const sym = await binance.getSymbolInfo(symbol);
    if (!sym) return res.status(400).json({ error: "Symbol not supported on Binance" });

    const lot = sym.filters.find(f => f.filterType === "LOT_SIZE");
    const minNotional = sym.filters.find(f => f.filterType === "MIN_NOTIONAL");
    const step = lot ? lot.stepSize : "0.00000001";
    const minQty = lot ? parseFloat(lot.minQty) : 0.00000001;

    let qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum < minQty)
      return res.status(400).json({ error: `Quantity too small. Min qty: ${minQty}` });

    const adjQty = binance.adjustQuantityToStep(qtyNum, step);
    if (adjQty <= 0)
      return res.status(400).json({ error: "quantity becomes 0 after step adjustment" });

    let usedPrice = price ? parseFloat(price) : null;
    if (!usedPrice) {
      const pObj = await binance.getPrice(symbol);
      usedPrice = parseFloat(pObj.price);
    }
    if (minNotional) {
      const minNot = parseFloat(minNotional.minNotional);
      const notional = usedPrice * adjQty;
      if (notional < minNot)
        return res.status(400).json({ error: `Order notional too small. Min notional: ${minNot}` });
    }

    const finalParams = { symbol, side, type, quantity: adjQty.toString() };
    if (type === "LIMIT") {
      finalParams.price = String(price);
      finalParams.timeInForce = "GTC";
    }

    const enableFile = path.join(__dirname, "ENABLE_REAL");
    const envReal = process.env.BINANCE_REAL === "true";
    const enableFileExists =
      fs.existsSync(enableFile) && fs.readFileSync(enableFile, "utf8").trim() === "ENABLE";
    const realAllowed = envReal && enableFileExists;

    log("ORDER_REQUEST", { user: req.user.username, finalParams, envReal, enableFileExists });

    if (!realAllowed) {
      const sim = {
        simulated: true,
        message:
          "Real trading not enabled. To enable: set BINANCE_REAL=true in .env AND create ENABLE_REAL file.",
        params: finalParams,
      };
      return res.json(sim);
    }

    const result = await binance.placeOrder(finalParams, true);
    log("ORDER_RESULT", result);
    return res.json(result);
  } catch (err) {
    log("order err", err.response?.data || err.message || err);
    res.status(500).json({ error: err.response?.data || err.message || String(err) });
  }
});

app.get("/api/order/status", verifyToken, async (req, res) => {
  try {
    const { symbol, orderId } = req.query;
    if (!symbol || !orderId)
      return res.status(400).json({ error: "symbol & orderId required" });
    await binance.syncServerTime();
    const data = await binance.getOrderStatus(symbol, orderId);
    res.json(data);
  } catch (err) {
    log("order status err", err.response?.data || err.message || err);
    res.status(500).json({ error: err.response?.data || err.message || err });
  }
});

app.get("/api/account", verifyToken, async (req, res) => {
  try {
    await binance.syncServerTime();
    const data = await binance.getAccount();
    res.json(data);
  } catch (err) {
    log("account err", err.response?.data || err.message || err);
    res.status(500).json({ error: err.response?.data || err.message || err });
  }
});

// Serve index.html
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.listen(PORT, () =>
  log(`Server listening http://localhost:${PORT} — BINANCE_REAL=${process.env.BINANCE_REAL}`)
);
