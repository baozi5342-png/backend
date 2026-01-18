const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running");
});

/* 你的API路由 */
app.use("/api/coins", require("./routes/coins"));
app.use("/api/users", require("./routes/users"));
app.use("/api/contracts", require("./routes/contracts"));
app.use("/api/withdraw", require("./routes/withdraw"));

/* ✅ 后台可视化页面（静态站点） */
app.use("/admin", express.static(path.join(__dirname, "admin")));

/* 直接访问 /admin 自动打开 index.html */
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
