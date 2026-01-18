const express = require('express');
const app = express();
const port = process.env.PORT || 10000;
const db = require('./config/db');

// 引入路由
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const contractsRoutes = require('./routes/contracts');
const marketsRoutes = require('./routes/markets');

// 中间件
app.use(express.json());

// 路由配置
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/markets', marketsRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
