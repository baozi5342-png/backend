const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { pool } = require("../db/pool");

const router = express.Router();

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function parseAuth(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

router.post("/register", async (req, res) => {
  const schema = z.object({
    username: z.string().min(3).max(32),
    password: z.string().min(6).max(64),
    email: z.string().email().optional().default("")
  });
  const { username, password, email } = schema.parse(req.body);

  const r = await pool.query(
    "INSERT INTO users(username,password,email) VALUES($1,$2,$3) RETURNING id, username, email",
    [username, password, email]
  );

  const user = r.rows[0];
  await pool.query(
    "INSERT INTO wallets(user_id,currency,balance,frozen) VALUES($1,'USDT',0,0) ON CONFLICT(user_id,currency) DO NOTHING",
    [user.id]
  );

  const token = signToken({ userId: user.id, username: user.username });
  res.json({ ok: true, token, user });
});

router.post("/login", async (req, res) => {
  const schema = z.object({
    username: z.string().min(3).max(32),
    password: z.string().min(1).max(64)
  });
  const { username, password } = schema.parse(req.body);

  const r = await pool.query("SELECT id, username, email, password FROM users WHERE username=$1", [username]);
  if (r.rowCount === 0) return res.status(401).json({ ok: false, message: "Invalid credentials" });

  const u = r.rows[0];
  if (u.password !== password) return res.status(401).json({ ok: false, message: "Invalid credentials" });

  const token = signToken({ userId: u.id, username: u.username });
  res.json({ ok: true, token, user: { id: u.id, username: u.username, email: u.email } });
});

router.post("/verify", async (req, res) => {
  const token = parseAuth(req) || req.body?.token;
  if (!token) return res.status(401).json({ ok: false, message: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ ok: true, decoded });
  } catch {
    res.status(401).json({ ok: false, message: "Invalid token" });
  }
});

module.exports = router;
