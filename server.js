require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// 路由
const authRoutes = require("./src/routes/auth");
const apiRoutes = require("./src/routes/api");
const adminRoutes = require("./src/routes/admin");

const app = express();

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json());

// 路由
app.use("/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/admin", adminRoutes);

// 健康检查
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend is running" });
});

// 启动
const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
