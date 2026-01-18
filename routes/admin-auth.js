const express = require("express");
const router = express.Router();

/**
 * 管理员登录
 * 账号密码来自环境变量
 */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    // 简单 token（不加密，后台用足够）
    const token = Buffer.from(
      `${username}:${Date.now()}`
    ).toString("base64");

    res.json({
      success: true,
      token
    });
  } else {
    res.status(401).json({
      success: false,
      message: "账号或密码错误"
    });
  }
});

module.exports = router;
