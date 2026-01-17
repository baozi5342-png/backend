/**
 * backend/server.js
 * 完整可运行版本（秒合约自动结算已接入）
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

// ===== 中间件 =====
app.use(cors());
app.use(express.json());

// ===== 数据库连接池 =====
const pool = require("./src/db/pool");

// ===== 路由 =====
const adminRoutes = require("./src/routes/admin");
const tradeRoutes = require("./src/routes/trade");

// 后台管理接口
app.use("/admin", adminRoutes);

// 前台交易接口
app.use("/api", tradeRoutes);

// ===== 健康检查 =====
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ===== 启动服务器 =====
app.listen(PORT, async () => {
  console.log(`Backend running on :${PORT}`);

  // 测试数据库是否连通
  try {
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL connected");
  } catch (err) {
    console.error("❌ PostgreSQL connection failed", err);
  }
});

// ===== 秒合约自动结算服务（核心） =====
const contractSettlementService = require("./src/services/contractSettlementService");

// ⚠️ 一定要在服务启动后调用
contractSettlementService.start();
