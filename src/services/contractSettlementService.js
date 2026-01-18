const db = require("../db/pool");
const { getPrice } = require("./priceCache");

/**
 * 自动结算已过期的秒合约订单（安全版）
 * - 只处理 status='OPEN' 且 created_at + duration 已到期
 * - exit_price 用后端行情缓存（priceCache）
 * - 任何错误都不抛出，只打印日志（避免 Render 崩）
 */
async function settlementExpiredContracts() {
  try {
    // 找 20 笔到期 OPEN 订单
    const { rows } = await db.query(
      `
      SELECT id, symbol, direction, amount, duration, entry_price, payout_rate, created_at
      FROM seconds_orders
      WHERE status='OPEN'
        AND (created_at + (duration || ' seconds')::interval) <= NOW()
      ORDER BY created_at ASC
      LIMIT 20
      `
    );

    if (!rows.length) return;

    for (const o of rows) {
      const exitPrice = Number(getPrice(o.symbol));
      if (!exitPrice || exitPrice <= 0) {
        console.log("[autoSettle] skip(no price):", o.id, o.symbol);
        continue;
      }

      const entry = Number(o.entry_price);
      let isWin = o.direction === "UP" ? exitPrice > entry : exitPrice < entry;

      const payout = Number(o.payout_rate || 0.85);
      const amount = Number(o.amount);
      const pnl = isWin ? amount * payout : -amount;

      // 只要订单还是 OPEN 就更新，避免重复结算
      await db.query(
        `
        UPDATE seconds_orders
        SET status='SETTLED',
            exit_price=$1,
            settled_at=NOW(),
            result=$2,
            pnl=$3
        WHERE id=$4 AND status='OPEN'
        `,
        [exitPrice, isWin ? "WIN" : "LOSE", pnl, o.id]
      );

      console.log("[autoSettle] settled:", o.id, o.symbol, isWin ? "WIN" : "LOSE");
    }
  } catch (err) {
    // ✅ 关键：永远不 throw
    console.error("[autoSettle ERROR]", err.message);
  }
}

module.exports = { settlementExpiredContracts };
