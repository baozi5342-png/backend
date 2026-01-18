const cache = new Map();
// cache: symbol -> { price, ts }

function setPrice(symbol, price) {
  cache.set(String(symbol).toUpperCase(), { price: Number(price), ts: Date.now() });
}

function getPrice(symbol) {
  const v = cache.get(String(symbol).toUpperCase());
  return v ? v.price : 0;
}

function getSnapshot(symbol) {
  const v = cache.get(String(symbol).toUpperCase());
  return v || { price: 0, ts: 0 };
}

module.exports = { setPrice, getPrice, getSnapshot };
