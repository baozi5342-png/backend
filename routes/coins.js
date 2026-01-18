const express = require("express");
const router = express.Router();
const db = require("../config/db");

/**
 * 获取热门币种（不需要登录）
 * GET /api/coins/hot
 */
router.get("/hot", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        symbol,
        name,
        icon,
        current_price,
        price_change
      FROM coins
      WHERE is_hot = true
      ORDER BY symbol ASC
      LIMIT 20
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("HOT COINS ERROR:", err);
    res.status(500).json({ message: "Failed to load market data" });
  }
});

module.exports = router;
