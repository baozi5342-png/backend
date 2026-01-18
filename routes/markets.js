const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 获取所有市场币种
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM markets WHERE deleted = false');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching markets:', err);
    res.status(500).send({ message: 'Server error' });
  }
});

// 新增币种
router.post('/', async (req, res) => {
  const { symbol, name } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO markets (symbol, name) VALUES ($1, $2) RETURNING *',
      [symbol, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding market:', err);
    res.status(500).send({ message: 'Error adding market' });
  }
});

// 启用/停用市场币种
router.put('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  try {
    const result = await db.query(
      'UPDATE markets SET enabled = $1 WHERE id = $2 RETURNING *',
      [enabled, id]
    );

    if (result.rows.length > 0) {
      res.status(200).json({ message: 'Market status updated successfully' });
    } else {
      res.status(404).json({ message: 'Market not found' });
    }
  } catch (err) {
    console.error('Error updating market status:', err);
    res.status(500).send({ message: 'Error updating market status' });
  }
});

module.exports = router;
