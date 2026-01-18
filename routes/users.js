const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 获取所有用户
router.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM users WHERE deleted = false');
  res.status(200).json(result.rows);
});

// 修改用户密码
router.put('/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const result = await db.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *', [newPassword, id]);

  if (result.rows.length > 0) {
    res.status(200).json({ message: 'Password reset successfully' });
  } else {
    res.status(400).json({ message: 'User not found' });
  }
});

module.exports = router;
