/**
 * backend/server.js
 * 最终稳定版（pool.query 一定可用）
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

// ===== 中间件 =====
app.use(cors());
app.use(express.json());

// ===== 数据库 =====
const pool = require("./src/db/pool");

// ===== 后台路由 =====
const adminRoutes = require("./src/routes/admin");
app.use("/admin", adminRoutes);

// ===== 健康检查 =====
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ================================
// 秒合约结算逻辑（内联稳定版）
// ================================

function decideResult(user, marketResult) {
  if (user.force_result === "WIN") return "WIN";
  if (user.force_result === "LOSE") return "LOSE";

  if (user.win_rate !== null && user.win_rate !== undefined) {
    return Math.random() * 100 < user.win_rate ? "WIN" : "LOSE";
  }

  return marketResult;
}

function calcMarketResult() {
  return Math.random() > 0.5 ? "WIN" : "LOSE";
}

async function settleOrder(orderId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT * FROM contract_orders
       WHERE id=$1 AND status='OPEN'
       FOR UPDATE`,
      [orderId]
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return;
    }

    const order = rows[0];

    const userRes = await client.query(
      `SELECT win_rate, force_result FROM users WHERE id=$1`,
      [order.user_id]
    );
    const user = userRes.rows[0];

    const finalResult = decideResult(user, calcMarketResult());

    let profit = 0;
    if (finalResult === "WIN") {
      profit = order.stake * order.payout_ratio;
    }

    await client.query(
      `UPDATE contract_orders
       SET status='SETTLED',
           result=$1,
           close_price=open_price
       WHERE id=$2`,
      [finalResult, order.id]
    );

    if (finalResult === "WIN") {
      await client.query(
        `UPDATE wallets
         SET frozen=frozen-$1,
             balance=balance+$1+$2
         WHERE user_id=$3 AND currency='USDT'`,
        [order.stake, profit, order.user_id]
      );
    } else {
      await client.query(
        `UPDATE wallets
         SET frozen=frozen-$1
         WHERE user_id=$2 AND currency='USDT'`,
        [order.stake, order.user_id]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Settlement error:", err);
  } finally {
    client.release();
  }
}

async function scanAndSettle() {
  const { rows } = await pool.query(
    `SELECT id FROM contract_orders
     WHERE status='OPEN' AND settle_at <= NOW()`
  );

  for (const r of rows) {
    await settleOrder(r.id);
  }
}

// 每秒扫描
setInterval(scanAndSettle, 1000);

// ===== 启动服务 =====
app.listen(PORT, async () => {
  console.log(`Backend running on :${PORT}`);
  try {
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL connected");
    console.log("✅ Contract settlement loop started");
  } catch (err) {
    console.error("❌ PostgreSQL connection failed", err);
  }
});
