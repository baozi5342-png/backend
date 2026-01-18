const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 登录接口（简单示范）
router.post('/login', async (req, res) => {
  const { uid, password } = req.body;

  const result = await db.query('SELECT * FROM users WHERE uid = $1 AND password_hash = $2', [uid, password]);
  if (result.rows.length > 0) {
    res.status(200).send({ message: 'Login successful' });
  } else {
    res.status(401).send({ message: 'Invalid credentials' });
  }
});

module.exports = router;
