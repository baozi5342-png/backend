const axios = require("axios");

let last = { symbol: (process.env.MARKET_SYMBOL || "BTCUSDT").toUpperCase(), price: null, updatedAt: null };

function getSymbol() {
  return (process.env.MARKET_SYMBOL || "BTCUSDT").toUpperCase();
}

async function fetchPriceOnce() {
  const symbol = getSymbol();
  const url = "https://api.binance.com/api/v3/ticker/price";
  const res = await axios.get(url, { params: { symbol }, timeout: 8000 });
  const price = Number(res.data.price);
  if (!Number.isFinite(price)) throw new Error("Invalid price");
  last = { symbol, price, updatedAt: new Date().toISOString() };
  return last;
}

function getLast() {
  // 如果你后面要多币种，这里会扩展成 map
  return last;
}

function startPolling() {
  const ms = Number(process.env.PRICE_POLL_MS || 1000);
  const run = async () => { try { await fetchPriceOnce(); } catch {} };
  run();
  setInterval(run, ms);
}

module.exports = { startPolling, fetchPriceOnce, getLast };
