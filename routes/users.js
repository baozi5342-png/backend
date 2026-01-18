const express = require("express");
const router = express.Router();
const db = require("../db");

/* 用户列表 */
router.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT id, email, balance, is_disabled FROM users ORDER BY id DESC"
  );
  res.json(result.rows);
});

/* 冻结 / 解冻 */
router.post("/toggle", async (req, res) => {
  const { id, is_disabled } = req.body;

  await db.query(
    "UPDATE users SET is_disabled = $1 WHERE id = $2",
    [is_disabled, id]
  );

  res.json({ success: true });
});

module.exports = router;
