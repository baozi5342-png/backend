/**
 * backend/src/routes/trade.js
 * 秒合约下单接口（完整版）
 */

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

/**
 * 秒合约下单
 * POST /api/contract/order
 */
router.post("/contract/order", async (req, res) => {
  const { userId, symbol, direction, amount, productId } = req.body;

  if (!userId || !symbol || !direction || !amount || !productId) {
    return res.status(400).json({ message: "Invalid params" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ 校验用户状态
    const userRes = await client.query(
      `SELECT id, status FROM users WHERE id=$1`,
      [userId]
    );
    if (!userRes.rows.length) {
      throw new Error("User not found");
    }
    if (userRes.rows[0].status === "BANNED") {
      throw new Error("User banned");
    }

    // 2️⃣ 获取秒合约产品
    const productRes = await client.query(
      `SELECT * FROM contract_products
       WHERE id=$1 AND status='ACTIVE'`,
      [productId]
    );
    if (!productRes.rows.length) {
      throw new Error("Product not available");
    }

    const product = productRes.rows[0];

    // 3️⃣ 校验金额
    if (amount < product.min_amount || amount > product.max_amount) {
      throw new Error("Amount out of range");
    }

    // 4️⃣ 校验钱包余额
    const walletRes = await client.query(
      `SELECT balance, frozen FROM wallets
       WHERE user_id=$1 AND currency='USDT'
       FOR UPDATE`,
      [userId]
    );

    if (!walletRes.rows.length || walletRes.rows[0].balance < amount) {
      throw new Error("Insufficient balance");
    }

    // 5️⃣ 冻结资金
    await client.query(
      `UPDATE wallets
       SET balance = balance - $1,
           frozen = frozen + $1
       WHERE user_id=$2 AND currency='USDT'`,
      [amount, userId]
    );

    // 6️⃣ 写订单
    const settleAt = new Date(Date.now() + product.seconds * 1000);

    const orderRes = await client.query(
      `INSERT INTO contract_orders
       (user_id, symbol, direction, stake, payout_ratio,
        status, created_at, settle_at)
       VALUES ($1,$2,$3,$4,$5,'OPEN',NOW(),$6)
       RETURNING id`,
      [
        userId,
        symbol,
        direction,
        amount,
        product.payout_ratio,
        settleAt
      ]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      orderId: orderRes.rows[0].id
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
