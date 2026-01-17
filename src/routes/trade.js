// backend/src/routes/trade.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// 公开：币种行情（给前台用）
router.get("/market/coins", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT symbol,name,icon,category,current_price,price_change FROM coins ORDER BY symbol ASC"
  );
  res.json(rows);
});

// 公开：秒合约产品（给前台用）
router.get("/contract/products", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM contract_products WHERE status='ACTIVE' ORDER BY seconds ASC"
  );
  res.json(rows);
});

// 公开：钱包余额（简化版：只查 USDT）
router.get("/wallet/balance", async (req, res) => {
  const { userId, currency } = req.query;
  if (!userId) return res.status(400).json({ message: "userId required" });

  const cur = (currency || "USDT").toUpperCase();
  const { rows } = await pool.query(
    `SELECT balance, frozen FROM wallets WHERE user_id=$1 AND currency=$2`,
    [userId, cur]
  );

  if (!rows.length) return res.json({ balance: 0, frozen: 0 });
  res.json({ balance: Number(rows[0].balance || 0), frozen: Number(rows[0].frozen || 0) });
});

// 公开：最近订单
router.get("/contract/orders", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: "userId required" });

  const { rows } = await pool.query(
    `SELECT id,user_id,symbol,direction,stake,payout_ratio,status,result,created_at,settle_at
     FROM contract_orders
     WHERE user_id=$1
     ORDER BY id DESC
     LIMIT 20`,
    [userId]
  );
  res.json(rows);
});

// 秒合约下单
router.post("/contract/order", async (req, res) => {
  const { userId, symbol, direction, amount, productId } = req.body;

  if (!userId || !symbol || !direction || !amount || !productId) {
    return res.status(400).json({ message: "Invalid params" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 用户状态
    const u = await client.query("SELECT id,status FROM users WHERE id=$1", [userId]);
    if (!u.rows.length) throw new Error("User not found");
    if (u.rows[0].status === "BANNED") throw new Error("User banned");

    // 产品
    const p = await client.query(
      `SELECT * FROM contract_products WHERE id=$1 AND status='ACTIVE'`,
      [Number(productId)]
    );
    if (!p.rows.length) throw new Error("Product not available");
    const product = p.rows[0];

    const stake = Number(amount);
    if (stake < Number(product.min_amount) || stake > Number(product.max_amount)) {
      throw new Error("Amount out of range");
    }

    // 取开仓价（来自 coins.current_price）
    const m = await client.query("SELECT current_price FROM coins WHERE symbol=$1", [symbol]);
    const openPrice = m.rows.length ? Number(m.rows[0].current_price || 0) : 0;

    // 钱包锁定
    const w = await client.query(
      `SELECT balance,frozen FROM wallets
       WHERE user_id=$1 AND currency='USDT'
       FOR UPDATE`,
      [userId]
    );
    if (!w.rows.length) throw new Error("Wallet not found");
    if (Number(w.rows[0].balance) < stake) throw new Error("Insufficient balance");

    await client.query(
      `UPDATE wallets SET balance=balance-$1, frozen=frozen+$1
       WHERE user_id=$2 AND currency='USDT'`,
      [stake, userId]
    );

    const settleAt = new Date(Date.now() + Number(product.seconds) * 1000);

    const ins = await client.query(
      `INSERT INTO contract_orders
       (user_id,symbol,direction,stake,open_price,payout_ratio,status,created_at,settle_at)
       VALUES($1,$2,$3,$4,$5,$6,'OPEN',NOW(),$7)
       RETURNING id`,
      [
        userId,
        symbol,
        direction,
        stake,
        openPrice,
        Number(product.payout_ratio || 0),
        settleAt
      ]
    );

    await client.query("COMMIT");
    res.json({ success: true, orderId: ins.rows[0].id });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
