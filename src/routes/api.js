const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { pool } = require("../db/pool");
const { getLast, fetchPriceOnce } = require("../services/market");

const router = express.Router();

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ ok: false, message: "No token" });
  try {
    req.user = jwt.verify(m[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

router.get("/health", (req, res) => res.json({ ok: true }));

router.get("/market/price", (req, res) => {
  res.json({ ok: true, data: getLast() });
});

router.get("/market/price/refresh", async (req, res) => {
  const d = await fetchPriceOnce();
  res.json({ ok: true, data: d });
});

router.get("/wallet/:userId", auth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (userId !== Number(req.user.userId)) return res.status(403).json({ ok: false, message: "Forbidden" });

  const r = await pool.query("SELECT balance, frozen FROM wallets WHERE user_id=$1 AND currency='USDT'", [userId]);
  if (r.rowCount === 0) return res.json({ ok: true, wallet: { balance: 0, frozen: 0 } });
  res.json({ ok: true, wallet: r.rows[0] });
});

router.post("/wallet/deposit", auth, async (req, res) => {
  const schema = z.object({ userId: z.number().int().positive(), amount: z.number().positive() });
  const { userId, amount } = schema.parse(req.body);
  if (userId !== Number(req.user.userId)) return res.status(403).json({ ok: false, message: "Forbidden" });

  await pool.query("UPDATE wallets SET balance=balance+$1, updated_at=NOW() WHERE user_id=$2 AND currency='USDT'", [amount, userId]);
  res.json({ ok: true });
});

router.post("/withdraw/request", auth, async (req, res) => {
  const schema = z.object({ userId: z.number().int().positive(), amount: z.number().positive(), address: z.string().min(5).max(256) });
  const { userId, amount, address } = schema.parse(req.body);
  if (userId !== Number(req.user.userId)) return res.status(403).json({ ok: false, message: "Forbidden" });

  const w = await pool.query("SELECT balance FROM wallets WHERE user_id=$1 AND currency='USDT'", [userId]);
  const bal = Number(w.rows?.[0]?.balance || 0);
  if (bal < amount) return res.status(400).json({ ok: false, message: "Insufficient balance" });

  await pool.query("UPDATE wallets SET balance=balance-$1, updated_at=NOW() WHERE user_id=$2 AND currency='USDT'", [amount, userId]);
  await pool.query("INSERT INTO withdraw_requests(user_id,amount,address) VALUES($1,$2,$3)", [userId, amount, address]);
  res.json({ ok: true });
});

// coins 给 home/markets 用（不要求登录也可）
router.get("/coins", async (req, res) => {
  const category = String(req.query.category || "Crypto");
  const r = await pool.query(
    "SELECT symbol,name,icon,category,current_price AS \"currentPrice\",price_change AS \"priceChange\" FROM coins WHERE category=$1 ORDER BY symbol ASC",
    [category]
  );
  res.json({ ok: true, items: r.rows });
});

// 秒合约下单
router.post("/trade/seconds/order", auth, async (req, res) => {
  const schema = z.object({
    userId: z.number().int().positive(),
    symbol: z.string().min(3).max(32),
    direction: z.enum(["UP", "DOWN"]),
    stake: z.number().positive(),
    durationSec: z.number().int().min(10).max(600)
  });
  const b = schema.parse(req.body);
  if (b.userId !== Number(req.user.userId)) return res.status(403).json({ ok: false, message: "Forbidden" });

  const price = getLast().price;
  if (!price) return res.status(503).json({ ok: false, message: "Price not ready" });

  // 冻结资金：balance -> frozen
  const w = await pool.query("SELECT balance,frozen FROM wallets WHERE user_id=$1 AND currency='USDT' FOR UPDATE", [b.userId]);
  const bal = Number(w.rows?.[0]?.balance || 0);
  if (bal < b.stake) return res.status(400).json({ ok: false, message: "Insufficient balance" });

  await pool.query(
    "UPDATE wallets SET balance=balance-$1, frozen=frozen+$1, updated_at=NOW() WHERE user_id=$2 AND currency='USDT'",
    [b.stake, b.userId]
  );

  const settleAt = new Date(Date.now() + b.durationSec * 1000);
  const r = await pool.query(
    `INSERT INTO contract_orders(user_id,symbol,direction,stake,open_price,settle_at)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [b.userId, b.symbol.toUpperCase(), b.direction, b.stake, price, settleAt]
  );

  res.json({ ok: true, order: r.rows[0] });
});

router.get("/trade/seconds/orders/:userId", auth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (userId !== Number(req.user.userId)) return res.status(403).json({ ok: false, message: "Forbidden" });

  const r = await pool.query("SELECT * FROM contract_orders WHERE user_id=$1 ORDER BY id DESC LIMIT 50", [userId]);
  res.json({ ok: true, orders: r.rows });
});

router.post("/kyc/basic", auth, async (req, res) => {
  res.json({ ok: true });
});
router.post("/kyc/advanced", auth, async (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
