/**
 * backend/server.js
 * 修复版：移除缺失的 trade 路由，保证服务先跑起来
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

// ===== 中间件 =====
app.use(cors());
app.use(express.json());

// ===== 数据库 =====
const pool = require("./src/db/pool");

// ===== 后台管理路由 =====
const adminRoutes = require("./src/routes/admin");
app.use("/admin", adminRoutes);

// ===== 健康检查 =====
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ===== 启动服务 =====
app.listen(PORT, async () => {
  console.log(`Backend running on :${PORT}`);
  try {
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL connected");
  } catch (err) {
    console.error("❌ PostgreSQL connection failed", err);
  }
});

// ===== 秒合约自动结算服务 =====
const contractSettlementService = require("./src/services/contractSettlementService");
contractSettlementService.start();
