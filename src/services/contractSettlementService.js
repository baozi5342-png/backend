const pool = require('../db/pool');

/**
 * 扫描并结算到期秒合约
 */
async function scanAndSettleContracts() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT * FROM contract_orders
      WHERE status = 'OPEN'
        AND expire_at <= NOW()
    `);

    for (const order of rows) {
      await settleOne(order, client);
    }
  } catch (err) {
    console.error('❌ 扫描结算失败', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 单笔结算
 */
async function settleOne(order, client) {
  const result = Math.random() > 0.5 ? 'WIN' : 'LOSE';
  const profit = result === 'WIN'
    ? order.amount * order.odds
    : -order.amount;

  await client.query(
    `UPDATE contract_orders
     SET status = 'SETTLED', result = $1, profit = $2
     WHERE id = $3`,
    [result, profit, order.id]
  );
}

/**
 * 👉 server.js 只调用这个
 */
async function settlementExpiredContracts() {
  return scanAndSettleContracts();
}

module.exports = {
  scanAndSettleContracts,
  settlementExpiredContracts
};
