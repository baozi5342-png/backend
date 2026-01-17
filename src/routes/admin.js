// backend/src/routes/admin.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// 简单的管理员校验（先用 API KEY，后面可升级）
function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// 获取用户列表
router.get("/users", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, created_at
       FROM users
       ORDER BY id DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// 获取钱包列表
router.get("/wallets", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.id, w.user_id, u.username, w.currency, w.balance, w.frozen
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
// 调整钱包余额（加钱 / 扣钱）
router.post("/wallet/adjust", adminAuth, async (req, res) => {
  const { userId, currency = "USDT", amount } = req.body;

  if (!userId || !amount || amount === 0) {
    return res.status(400).json({ message: "Invalid params" });
  }

  try {
    // 确保钱包存在
    await pool.query(
      `INSERT INTO wallets (user_id, currency, balance)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id, currency) DO NOTHING`,
      [userId, currency]
    );

    // 调整余额（可正可负）
    await pool.query(
      `UPDATE wallets
       SET balance = balance + $1
       WHERE user_id = $2 AND currency = $3`,
      [amount, userId, currency]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
 
module.exports = router;
