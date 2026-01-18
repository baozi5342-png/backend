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

/* API 路由 */
app.use("/api/coins", require("./routes/coins"));
app.use("/api/users", require("./routes/users"));
app.use("/api/contracts", require("./routes/contracts"));
app.use("/api/withdraw", require("./routes/withdraw"));

/* 后台页面 */
app.use("/admin", express.static(path.join(__dirname, "admin")));
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
