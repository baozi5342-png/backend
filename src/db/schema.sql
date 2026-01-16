CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password VARCHAR(128) NOT NULL DEFAULT '',
  email VARCHAR(128) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  currency VARCHAR(16) NOT NULL DEFAULT 'USDT',
  balance NUMERIC(24, 8) NOT NULL DEFAULT 0,
  frozen  NUMERIC(24, 8) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

CREATE TABLE IF NOT EXISTS contract_orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  symbol VARCHAR(32) NOT NULL,
  direction VARCHAR(8) NOT NULL,   -- UP / DOWN
  stake NUMERIC(24, 8) NOT NULL,
  open_price NUMERIC(24, 8) NOT NULL,
  close_price NUMERIC(24, 8),
  payout_ratio NUMERIC(10, 4) NOT NULL DEFAULT 0.95,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  result VARCHAR(8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settle_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS withdraw_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  amount NUMERIC(24, 8) NOT NULL,
  address VARCHAR(256) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coins (
  symbol VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL DEFAULT '',
  icon VARCHAR(16) NOT NULL DEFAULT '',
  category VARCHAR(16) NOT NULL DEFAULT 'Crypto',
  current_price NUMERIC(24, 8) NOT NULL DEFAULT 0,
  price_change NUMERIC(10, 2) NOT NULL DEFAULT 0
);

-- 默认给你塞几条，home/markets 就能立刻显示
INSERT INTO coins(symbol,name,icon,category,current_price,price_change)
VALUES
('BTC','Bitcoin','₿','Popular',95000,2.45),
('ETH','Ethereum','Ξ','Popular',3200,1.20),
('SOL','Solana','◎','Popular',190,-0.80),
('BTCUSDT','Bitcoin','₿','Crypto',95000,2.45),
('ETHUSDT','Ethereum','Ξ','Crypto',3200,1.20),
('SOLUSDT','Solana','◎','Crypto',190,-0.80),
('XAUUSD','Gold','🥇','Gold',2050,0.30),
('EURUSD','Euro','💶','Forex',1.08,-0.10)
ON CONFLICT(symbol) DO NOTHING;
