const { Pool } = require("pg");

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const pool = new Pool({
  connectionString: mustGetEnv("DATABASE_URL"),
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

module.exports = { pool };
