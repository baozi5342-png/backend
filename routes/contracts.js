const express = require("express");
const router = express.Router();
const db = require("../config/db");

/**
 * 秒合约产品列表
 */
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, duration, profit_rate, min_amount, max_amount, is_enabled, created_at FROM second_contracts ORDER BY duration ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "获取秒合约失败" });
  }
});

/**
 * 更新秒合约参数
 */
router.post("/update", async (req, res) => {
  const { id, profit_rate, min_amount, max_amount, is_enabled } = req.body;
  try {
    await db.query(
      `UPDATE second_contracts 
       SET profit_rate=$1, min_amount=$2, max_amount=$3, is_enabled=$4 
       WHERE id=$5`,
      [profit_rate, min_amount, max_amount, is_enabled, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "更新失败" });
  }
});

module.exports = router;
