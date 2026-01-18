const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

/* 健康检查 */
app.get("/", (req, res) => {
  res.send("API running");
});

/* 管理员登录接口 */
app.use("/api/admin", require("./routes/admin-auth"));

/* 🔐 管理员鉴权中间件 */
function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token) {
    return res.status(401).json({ message: "未登录" });
  }
  next();
}

/* 受保护 API */
app.use("/api/coins", adminAuth, require("./routes/coins"));
app.use("/api/users", adminAuth, require("./routes/users"));
app.use("/api/contracts", adminAuth, require("./routes/contracts"));
app.use("/api/withdraw", adminAuth, require("./routes/withdraw"));

/* 后台页面 */
app.use("/admin", express.static(path.join(__dirname, "admin")));
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
// 访问 /admin 或 /admin/ 时，返回后台首页
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});
