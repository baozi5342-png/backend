const pool = require('../db/pool');

/**
 * 扫描并结算到期合约
 */
async function settlementExpiredContracts() {
  const client = await pool.connect();

  try {
    const { rows } = await client.query(`
      SELECT *
      FROM contract_orders
      WHERE status = 'OPEN'
        AND expire_at <= NOW()
      LIMIT 20
    `);

    for (const order of rows) {
      await settleOne(client, order);
    }
  } finally {
    client.release();
  }
}

/**
 * 单笔结算
 */
async function settleOne(client, order) {
  const win = Math.random() > 0.5;
  const result = win ? 'WIN' : 'LOSE';
  const profit = win ? order.amount * order.odds : 0;

  await client.query(
    `UPDATE contract_orders
     SET status = 'SETTLED',
         result = $1,
         profit = $2
     WHERE id = $3`,
    [result, profit, order.id]
  );

  if (win) {
    await client.query(
      `UPDATE wallets
       SET balance = balance + $1
       WHERE user_id = $2`,
      [order.amount + profit, order.user_id]
    );
  }
}

module.exports = {
  settlementExpiredContracts
};
