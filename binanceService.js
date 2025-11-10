

// // binanceService.js
// const axios = require("axios");
// const crypto = require("crypto");
// require("dotenv").config();

// const BASE = process.env.BINANCE_BASE || "https://api.binance.com";
// const API_KEY = process.env.BINANCE_API_KEY || "";
// const SECRET = process.env.BINANCE_SECRET_KEY || "";
// const IS_REAL = process.env.BINANCE_REAL === "true";
// const RECV_WINDOW = Number(process.env.RECV_WINDOW || 5000);
// const TIMEOUT = 15000;

// let serverTimeOffset = 0; // ms

// async function syncServerTime() {
//   try {
//     const res = await axios.get(`${BASE}/api/v3/time`, { timeout: TIMEOUT });
//     const serverTime = res.data.serverTime;
//     serverTimeOffset = serverTime - Date.now();
//     return serverTime;
//   } catch (err) {
//     throw new Error("Cannot sync Binance server time: " + (err.message || err));
//   }
// }

// function now() {
//   return Date.now() + serverTimeOffset;
// }

// function sign(queryString) {
//   return crypto.createHmac("sha256", SECRET).update(queryString).digest("hex");
// }

// async function publicGet(path, params = {}) {
//   const url = `${BASE}${path}`;
//   const res = await axios.get(url, { params, timeout: TIMEOUT });
//   return res.data;
// }

// async function signedRequest(method, path, params = {}) {
//   if (!API_KEY || !SECRET) throw new Error("Binance API key/secret not set in .env");
//   params.timestamp = now();
//   params.recvWindow = RECV_WINDOW;
//   const qs = new URLSearchParams(params).toString();
//   const signature = sign(qs);
//   const url = `${BASE}${path}?${qs}&signature=${signature}`;
//   const headers = { "X-MBX-APIKEY": API_KEY };
//   const res = await axios({ method, url, headers, timeout: TIMEOUT });
//   return res.data;
// }

// // public helpers
// async function getPrice(symbol) {
//   return publicGet("/api/v3/ticker/price", { symbol: symbol.toUpperCase() });
// }

// let cachedInfo = null;
// let cachedAt = 0;
// const INFO_TTL = 1000 * 60 * 3;

// async function getExchangeInfo(force = false) {
//   if (!force && cachedInfo && Date.now() - cachedAt < INFO_TTL) return cachedInfo;
//   const res = await publicGet("/api/v3/exchangeInfo");
//   cachedInfo = res;
//   cachedAt = Date.now();
//   return res;
// }

// async function getSymbolInfo(symbol) {
//   const info = await getExchangeInfo();
//   return info.symbols.find(s => s.symbol === symbol.toUpperCase()) || null;
// }

// function adjustQuantityToStep(quantity, stepSize) {
//   const s = parseFloat(stepSize);
//   if (!s || s === 0) return quantity;
//   const decimals = (stepSize.split(".")[1] || "").length;
//   const adj = Math.floor(quantity / s) * s;
//   return Number(adj.toFixed(decimals));
// }

// // place order (real or test)
// async function placeOrder(params) {
//   const path = IS_REAL ? "/api/v3/order" : "/api/v3/order/test";
//   const payload = {};
//   Object.keys(params).forEach(k => { if (params[k] !== undefined) payload[k] = String(params[k]); });
//   return signedRequest("POST", path, payload);
// }

// async function getOrderStatus(symbol, orderId) {
//   return signedRequest("GET", "/api/v3/order", { symbol: symbol.toUpperCase(), orderId: String(orderId) });
// }

// async function getAccount() {
//   return signedRequest("GET", "/api/v3/account", {});
// }

// module.exports = {
//   IS_REAL,
//   syncServerTime,
//   getPrice,
//   getExchangeInfo,
//   getSymbolInfo,
//   adjustQuantityToStep,
//   placeOrder,
//   getOrderStatus,
//   getAccount
// };










// binanceService.js
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const BASE = process.env.BINANCE_BASE || "https://api.binance.com";
const API_KEY = process.env.BINANCE_API_KEY || "";
const SECRET = process.env.BINANCE_SECRET_KEY || "";
const RECV_WINDOW = Number(process.env.RECV_WINDOW || 5000);
const TIMEOUT = 15000;
const INFO_TTL = Number(process.env.INFO_TTL_MS || 180000);

let serverTimeOffset = 0;
let cachedInfo = null;
let cachedAt = 0;

async function syncServerTime() {
  const res = await axios.get(`${BASE}/api/v3/time`, { timeout: TIMEOUT });
  serverTimeOffset = res.data.serverTime - Date.now();
  return res.data.serverTime;
}

function now() {
  return Date.now() + serverTimeOffset;
}

function sign(qs) {
  return crypto.createHmac("sha256", SECRET).update(qs).digest("hex");
}

async function publicGet(path, params = {}) {
  const url = `${BASE}${path}`;
  const res = await axios.get(url, { params, timeout: TIMEOUT });
  return res.data;
}

async function signedRequest(method, path, params = {}) {
  if (!API_KEY || !SECRET) throw new Error("Binance API key/secret not set in .env");
  params.timestamp = now();
  params.recvWindow = RECV_WINDOW;
  const qs = new URLSearchParams(params).toString();
  const signature = sign(qs);
  const url = `${BASE}${path}?${qs}&signature=${signature}`;
  const headers = { "X-MBX-APIKEY": API_KEY };
  const res = await axios({ method, url, headers, timeout: TIMEOUT });
  return res.data;
}

async function getPrice(symbol) {
  return publicGet("/api/v3/ticker/price", { symbol: symbol.toUpperCase() });
}

async function getExchangeInfo(force = false) {
  if (!force && cachedInfo && Date.now() - cachedAt < INFO_TTL) return cachedInfo;
  const res = await publicGet("/api/v3/exchangeInfo");
  cachedInfo = res;
  cachedAt = Date.now();
  return res;
}

async function getSymbolInfo(symbol) {
  const info = await getExchangeInfo();
  return info.symbols.find(s => s.symbol === symbol.toUpperCase()) || null;
}

function adjustQuantityToStep(quantity, stepSize) {
  try {
    const s = parseFloat(stepSize);
    if (!s || s === 0) return quantity;
    const decimals = (stepSize.split(".")[1] || "").length;
    const adj = Math.floor(quantity / s) * s;
    return Number(adj.toFixed(decimals));
  } catch {
    return quantity;
  }
}

async function placeOrder(params, useReal) {
  // params: { symbol, side, type, quantity, price?, timeInForce? }
  const path = useReal ? "/api/v3/order" : "/api/v3/order/test";
  const payload = {};
  Object.keys(params).forEach(k => { if (params[k] !== undefined) payload[k] = String(params[k]); });
  return signedRequest("POST", path, payload);
}

async function getOrderStatus(symbol, orderId) {
  return signedRequest("GET", "/api/v3/order", { symbol: symbol.toUpperCase(), orderId: String(orderId) });
}

async function getAccount() {
  return signedRequest("GET", "/api/v3/account", {});
}

module.exports = {
  syncServerTime,
  getPrice,
  getExchangeInfo,
  getSymbolInfo,
  adjustQuantityToStep,
  placeOrder,
  getOrderStatus,
  getAccount
};
