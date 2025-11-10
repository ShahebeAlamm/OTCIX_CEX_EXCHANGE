// // db.js
// const sqlite3 = require('sqlite3').verbose();
// const path = require('path');

// // 🔹 SQLite file path
// const dbPath = path.join(__dirname, 'otcix.db');

// // 🔹 Connect to DB
// const db = new sqlite3.Database(dbPath, (err) => {
//   if (err) console.error("❌ Database connection error:", err);
//   else console.log("✅ Connected to SQLite database (otcix.db)");
// });

// // 🔹 Create table for transactions if not exists
// db.serialize(() => {
//   db.run(`
//     CREATE TABLE IF NOT EXISTS transactions (
//       id TEXT PRIMARY KEY,
//       fromCurrency TEXT,
//       toCurrency TEXT,
//       amount REAL,
//       destinationAddress TEXT,
//       refundAddress TEXT,
//       payinAddress TEXT,
//       payinAmount REAL,
//       status TEXT,
//       createdAt TEXT DEFAULT CURRENT_TIMESTAMP
//     )
//   `);
// });

// module.exports = db;

// // 



