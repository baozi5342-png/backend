// src/services/contractSettlementService.js
// 秒合约结算服务（兜底版，保证后端可启动）

const pool = require("../db/pool");

/**
 * 扫描所有已到期但未结算的合约订单
 * 简化版本：由后台风控字段直接决定输赢
 */
async function scanAndSettleContracts() {
  try {
    const now = new Date();

    // 找到已到期、未结算订单
    const { rows } = await pool.query(`
      SELECT *
      FROM contract_orders
      WHERE status = 'OPEN'
        AND expire_time <= $1
      LIMIT 50
    `, [now]);

    for (const order of rows) {
      await settleOne(order);
    }
  } catch (err) {
    console.error("❌ 合约结算扫描失败:", err.message);
  }
}

/**
 * 结算单个订单
 */
async function settleOne(order) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 👉 后台可控输赢（admin_force_result）
    const finalResult = order.admin_force_result || randomResult();

    const win = finalResult === "WIN";
    const payout = win
      ? Number(order.stake) * Number(order.payout_ratio)
      : 0;

    // 更新订单状态
    await client.query(`
      UPDATE contract_orders
      SET status = 'CLOSED',
          result = $1,
          settled_at = NOW()
      WHERE id = $2
    `, [finalResult, order.id]);

    // 如果赢，返钱
    if (win) {
      await client.query(`
        UPDATE wallets
        SET balance = balance + $1
        WHERE user_id = $2
      `, [payout, order.user_id]);
    }

    await client.query("COMMIT");
    console.log(`✅ 订单 ${order.id} 已结算: ${finalResult}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ 结算订单失败:", err.message);
  } finally {
    client.release();
  }
}

/**
 * 随机输赢（兜底）
 */
function randomResult() {
  return Math.random() > 0.5 ? "WIN" : "LOSE";
}

module.exports = {
  scanAndSettleContracts
};
