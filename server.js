require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// ===== 路由 =====
const authRoutes = require("./src/routes/auth");
const apiRoutes = require("./src/routes/api");
const adminRoutes = require("./src/routes/admin");

// ===== 定时结算服务 =====
const {
  settlementExpiredContracts,
} = require("./src/services/contractSettlement");

const app = express();

// ===== 基础中间件 =====
app.use(helmet());
app.use(cors());
app.use(express.json());

// ===== 路由挂载 =====
app.use("/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/admin", adminRoutes);

// ===== 健康检查（可选，但推荐）=====
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend is running" });
});

// ===== 秒合约兜底扫描（安全）=====
// 说明：
// - 只扫描，不直接结算
// - 即使 SQL 出错，也不会导致 Render 崩溃
setInterval(() => {
  settlementExpiredContracts();
}, 5000);

// ===== 启动服务 =====
const PORT = Number(process.env.PORT || 10000);

app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
