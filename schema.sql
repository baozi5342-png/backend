-- 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  password VARCHAR(100) NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0
);

-- 秒合约表
CREATE TABLE second_contracts (
  id SERIAL PRIMARY KEY,
  contract_name VARCHAR(100),
  duration INT NOT NULL, -- 周期
  profit_rate NUMERIC(5,2) NOT NULL, -- 盈利比例
  min_amount NUMERIC(18,2), -- 最小金额
  max_amount NUMERIC(18,2) -- 最大金额
);
