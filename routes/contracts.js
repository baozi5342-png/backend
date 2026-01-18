const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 获取秒合约列表
router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM second_contracts WHERE deleted = false');
  res.status(200).json(result.rows);
});

// 新增秒合约产品
router.post('/', async (req, res) => {
  const { duration, profit_rate, min_amount, max_amount } = req.body;
  const result = await db.query(
    'INSERT INTO second_contracts (duration, profit_rate, min_amount, max_amount) VALUES ($1, $2, $3, $4) RETURNING *',
    [duration, profit_rate, min_amount, max_amount]
  );

  res.status(201).json(result.rows[0]);
});

module.exports = router;
