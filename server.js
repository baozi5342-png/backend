require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./src/routes/auth");
const apiRoutes = require("./src/routes/api");
const adminRoutes = require("./src/routes/admin");
const { startPolling } = require("./src/services/market");

const app = express();

// ===== 基础中间件 =====
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());

// ===== 路由 =====
app.use("/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/admin", adminRoutes);

// ===== 启动行情轮询 =====
startPolling();

// ===== 启动服务 =====
const port = Number(process.env.PORT || 10000);
app.listen(port, () => {
  console.log(`Backend running on :${port}`);
});
