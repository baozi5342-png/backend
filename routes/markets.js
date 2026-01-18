const express = require("express");
const router = express.Router();
const db = require("../config/db");

/**
 * 获取市场币种列表
 */
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, symbol, name, sort, is_enabled, created_at FROM markets ORDER BY sort DESC, id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "获取市场币种失败" });
  }
});

/**
 * 启用 / 禁用币种
 */
router.post("/toggle", async (req, res) => {
  const { id, is_enabled } = req.body;
  try {
    await db.query(
      "UPDATE markets SET is_enabled=$1 WHERE id=$2",
      [is_enabled, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "操作失败" });
  }
});

/**
 * 修改排序
 */
router.post("/sort", async (req, res) => {
  const { id, sort } = req.body;
  try {
    await db.query(
      "UPDATE markets SET sort=$1 WHERE id=$2",
      [sort, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "排序修改失败" });
  }
});

module.exports = router;
