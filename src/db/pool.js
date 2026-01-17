/**
 * backend/src/db/pool.js
 * PostgreSQL 连接池（标准版）
 */

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("❌ Missing env: DATABASE_URL");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
