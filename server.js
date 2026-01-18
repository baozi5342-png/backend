require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const adminRoutes = require("./routes/admin");
const tradeRoutes = require("./routes/trade");

// 如果你有结算服务（可选）
let settlementService = null;
try {
  settlementService = require("./services/contractSettlementService");
} catch (e) {
  console.warn("⚠️ 未加载结算服务（不影响启动）");
}

const app = express();
const PORT = process.env.PORT || 10000;

// ===== 基础中间件 =====
app.use(cors());
app.use(express.json());

// ===== ✅【关键】暴露后台静态页面 =====
app.use(
  "/admin",
  express.static(path.join(__dirname, "../admin"))
);

// ===== API 路由 =====
app.use("/admin", adminRoutes);
app.use("/trade", tradeRoutes);

// ===== 健康检查 =====
app.get("/", (req, res) => {
  res.send("FoxPro Exchange Backend Running");
});

// ===== 启动服务 =====
app.listen(PORT, () => {
  console.log(`✅ Backend running on :${PORT}`);
});

// ===== 启动秒合约结算轮询（如果存在）=====
if (settlementService && settlementService.startSettlementLoop) {
  settlementService.startSettlementLoop();
  console.log("✅ Contract settlement loop started");
}
