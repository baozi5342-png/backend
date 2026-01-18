const express = require("express");
const router = express.Router();
const db = require("../db");

/* 查询所有币种 */
router.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT * FROM coins ORDER BY id DESC"
  );
  res.json(result.rows);
});

/* 启用 / 禁用 */
router.post("/toggle", async (req, res) => {
  const { id, is_disabled } = req.body;

  await db.query(
    "UPDATE coins SET is_disabled = $1 WHERE id = $2",
    [is_disabled, id]
  );

  res.json({ success: true });
});

module.exports = router;
