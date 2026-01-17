// backend/src/routes/admin.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// 简单的管理员校验（先用 API KEY，后面可升级）
function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// 获取用户列表
router.get("/users", adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, created_at
       FROM users
       ORDER BY id DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
