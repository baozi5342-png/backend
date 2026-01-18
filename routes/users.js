const express = require("express");
const router = express.Router();
const db = require("../config/db");

/**
 * 用户列表
 */
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT id, email, balance, status, created_at FROM users ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "获取用户失败" });
  }
});

/**
 * 冻结 / 解冻用户
 */
router.post("/toggle", async (req, res) => {
  const { id, status } = req.body;
  try {
    await db.query(
      "UPDATE users SET status=$1 WHERE id=$2",
      [status, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "操作失败" });
  }
});

/**
 * 重置密码
 */
router.post("/reset-password", async (req, res) => {
  const { id, new_password } = req.body;
  try {
    await db.query(
      "UPDATE users SET password=$1 WHERE id=$2",
      [new_password, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "修改密码失败" });
  }
});

module.exports = router;
