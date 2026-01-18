const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 提现接口
router.post('/withdraw', async (req, res) => {
  const { amount } = req.body;
  
  // 假设用户 ID 是从 session 中获取，示例中将其硬编码为 1
  const userId = 1;

  try {
    // 获取用户当前余额
    const userResult = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // 检查余额是否足够
    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // 更新用户余额
    await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, userId]);

    res.status(200).json({ message: 'Withdrawal successful' });
  } catch (error) {
    console.error('Error during withdrawal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
