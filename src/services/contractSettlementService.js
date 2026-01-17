// backend/src/services/contractSettlementService.js
const pool = require("../db/pool");

/**
 * 秒合约结算服务
 * - 扫描已到期的 OPEN 订单
 * - 根据用户风控决定 WIN / LOSE
 * - 返还钱包（本金 + 盈利 或 扣除）
 */
async function settleExpiredContracts() {
  const client = await pool.connect();

  try {
    // 1️⃣ 找到所有已到期但未结算的订单
    const { rows: orders } = await client.query(
      `
      SELECT o.*, u.win_rate, u.force_result
      FROM contract_orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.status = 'OPEN'
        AND o.settle_at <= NOW()
      ORDER BY o.id ASC
      LIMIT 50
      `
    );

    if (!orders.length) return;

    for (const order of orders) {
      await client.query("BEGIN");

      const stake = Number(order.stake);
      const payoutRatio = Number(order.payout_ratio || 0);

      // 2️⃣ 决定输赢（核心逻辑）
      let result;

      if (order.force_result === "WIN") {
        result = "WIN";
      } else if (order.force_result === "LOSE") {
        result = "LOSE";
      } else if (order.win_rate !== null) {
        // 胜率控制（例如 60%）
        const r = Math.random() * 100;
        result = r < Number(order.win_rate) ? "WIN" : "LOSE";
      } else {
        // 完全随机
        result = Math.random() < 0.5 ? "WIN" : "LOSE";
      }

      // 3️⃣ 计算结算金额
      let profit = 0;
      let walletDelta = 0;

      if (result === "WIN") {
        profit = stake * payoutRatio;
        walletDelta = stake + profit;
      } else {
        walletDelta = 0; // 输了，本金不返
      }

      // 4️⃣ 更新订单
      await client.query(
        `
        UPDATE contract_orders
        SET status='SETTLED',
            result=$1,
            close_price=open_price,
            settled_at=NOW()
        WHERE id=$2
        `,
        [result, order.id]
      );

      // 5️⃣ 更新钱包（解冻 + 结算）
      if (result === "WIN") {
        await client.query(
          `
          UPDATE wallets
          SET frozen = frozen - $1,
              balance = balance + $2
          WHERE user_id=$3 AND currency='USDT'
          `,
          [stake, walletDelta, order.user_id]
        );
      } else {
        // 输：只解冻，不返还
        await client.query(
          `
          UPDATE wallets
          SET frozen = frozen - $1
          WHERE user_id=$2 AND currency='USDT'
          `,
          [stake, order.user_id]
        );
      }

      await client.query("COMMIT");

      console.log(
        `✅ Contract settled | order=${order.id} | user=${order.user_id} | ${result}`
      );
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Contract settlement error:", err.message);
  } finally {
    client.release();
  }
}

module.exports = {
  settleExpiredContracts
};
