const express = require('express');
const cors = require('cors');
const pool = require('./src/db/pool');

const {
  settlementExpiredContracts
} = require('./src/services/contractSettlementService');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

/** 健康检查 */
app.get('/', (req, res) => {
  res.send('Backend is running');
});

/** 示例接口 */
app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

/** 启动服务器 */
app.listen(PORT, async () => {
  console.log(`Backend running on :${PORT}`);

  try {
    await pool.query('select 1');
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection failed', err);
    process.exit(1);
  }

  console.log('Contract settlement loop started');

  /** 每 5 秒扫描一次到期合约 */
  setInterval(() => {
    settlementExpiredContracts().catch(err => {
      console.error('Settlement error:', err);
    });
  }, 5000);
});
