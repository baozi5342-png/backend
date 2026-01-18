require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./src/routes/auth");
const apiRoutes = require("./src/routes/api");
const adminRoutes = require("./src/routes/admin");

const { startBinancePolling } = require("./src/services/market");
const { settlementExpiredContracts } = require("./src/services/contractSettlement");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => res.json({ ok: true, message: "Backend is running" }));

// ✅ 启动后端行情轮询（给前端 + 自动结算用）
startBinancePolling();

// ✅ 自动结算开关：默认关闭，只有你设置 ENABLE_AUTO_SETTLE=true 才启用
if (String(process.env.ENABLE_AUTO_SETTLE || "").toLowerCase() === "true") {
  setInterval(() => {
    settlementExpiredContracts();
  }, 2000);
  console.log("[autoSettle] ENABLED");
} else {
  console.log("[autoSettle] DISABLED (set ENABLE_AUTO_SETTLE=true to enable)");
}

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => console.log("Backend running on port", PORT));
