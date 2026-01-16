require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./src/routes/auth");
const apiRoutes = require("./src/routes/api");
const adminRoutes = require("./src/routes/admin");
const { startPolling } = require("./src/services/market");

const app = express();
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/admin", adminRoutes);

startPolling();

const port = Number(process.env.PORT || 10000);
app.listen(port, () => console.log(`Backend running on :${port}`));
