const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 获取所有市场币种
router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM markets WHERE deleted = false');
  res.status(200).json(result.rows);
});

// 新增币种
router.post('/', async (req, res) => {
  const { symbol, name } = req.body;
  const result = await db.query(
    'INSERT INTO markets (symbol, name) VALUES ($1, $2) RETURNING *',
    [symbol, name]
  );

  res.status(201).json(result.rows[0]);
});

module.exports = router;
