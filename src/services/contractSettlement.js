// backend/src/services/contractSettlementService.js
const pool = require("../db/pool");
const { decideResult } = require("./contractSettlement");

// 模拟行情判断（你后面可替换为真实行情）
function calcMarketResult(order) {
  // 示例：随机涨跌
  return Math.random() > 0.5 ? "WIN" : "LOSE";
}

async function settleOrder(order) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 锁定订单，防止重复结算
    const { rows } = await client.query(
      `SELECT * FROM contract_orders
       WHERE id = $1 AND status = 'OPEN'
       FOR UPDATE`,
      [order.id]
    );
    if (!rows.length) {
      await client.query("ROLLBACK");
      return;
    }

    const o = rows[0];

    // 获取用户（含风控）
    const userRes = await client.query(
      `SELECT id, win_rate, force_result FROM users WHERE id = $1`,
      [o.user_id]
    );
    const user = userRes.rows[0];

    // 行情结果（涨/跌）
    const marketResult = calcMarketResult(o);

    // 🔥 最终结果（核心）
    const finalResult = decideResult(user, marketResult);

    let profit = 0;

    if (finalResult === "WIN") {
      profit = o.stake * o.payout_ratio;
    }

    // 更新订单
    await client.query(
      `UPDATE contract_orders
       SET status='SETTLED',
           result=$1,
           close_price=open_price,
           payout_ratio=payout_ratio
       WHERE id=$2`,
      [finalResult, o.id]
    );

    // 更新钱包
    if (finalResult === "WIN") {
      // 赢：返还本金 + 盈利
      await client.query(
        `UPDATE wallets
         SET frozen = frozen - $1,
             balance = balance + $1 + $2
         WHERE user_id = $3 AND currency='USDT'`,
        [o.stake, profit, o.user_id]
      );
    } else {
      // 输：扣冻结
      await client.query(
        `UPDATE wallets
         SET frozen = frozen - $1
         WHERE user_id = $2 AND currency='USDT'`,
        [o.stake, o.user_id]
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
    await settleOrder(r);
  }
}

function start() {
  console.log("✅ Contract settlement service started");
  setInterval(scanAndSettle, 1000); // 每 1 秒扫描一次
}

module.exports = {
  start
};
