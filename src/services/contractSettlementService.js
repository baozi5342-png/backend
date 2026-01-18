const db = require("../db/pool");

/**
 * 安全版：扫描已过期但仍是 OPEN 状态的秒合约订单
 * 说明：
 * 1️⃣ 不使用任何不存在的字段（避免 42703）
 * 2️⃣ 只依赖 created_at + duration
 * 3️⃣ 出错只打印日志，不会导致 Render 崩溃
 */
async function settlementExpiredContracts() {
  try {
    const { rows } = await db.query(`
      SELECT id, uid, symbol, direction, amount, duration, entry_price, created_at
      FROM seconds_orders
      WHERE status = 'OPEN'
        AND (created_at + (duration || ' seconds')::interval) <= NOW()
      ORDER BY created_at ASC
      LIMIT 20
    `);

    if (!rows.length) return;

    for (const order of rows) {
      // ⚠️ 这里只是兜底扫描，不做真正结算
      // 真正结算仍然走：POST /api/seconds/orders/:id/settle
      console.log(
        "[contractSettlement] expired order detected:",
        order.id
      );
    }
  } catch (err) {
    // ❗关键：不抛异常，防止 Render 判定服务崩溃
    console.error(
      "[contractSettlement ERROR]",
      err.message
    );
  }
}

module.exports = {
  settlementExpiredContracts,
};
