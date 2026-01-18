const { setPrice } = require("./priceCache");

// 你需要支持哪些币就写哪些
const SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

// Node 18+ 自带 fetch（Render 通常是 18/20）
async function fetchPrice(symbol) {
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error(`binance http ${r.status}`);
  const j = await r.json();
  return Number(j.price);
}

let started = false;

function startBinancePolling() {
  if (started) return;
  started = true;

  // 立刻拉一次
  (async () => {
    for (const s of SYMBOLS) {
      try {
        const p = await fetchPrice(s);
        setPrice(s, p);
      } catch (e) {
        console.error("[market init]", s, e.message);
      }
    }
  })();

  // 每秒轮询
  setInterval(async () => {
    for (const s of SYMBOLS) {
      try {
        const p = await fetchPrice(s);
        setPrice(s, p);
      } catch (e) {
        // 不要 throw，避免影响服务
        console.error("[market]", s, e.message);
      }
    }
  }, 1000);

  console.log("[market] Binance polling started:", SYMBOLS.join(","));
}

module.exports = { startBinancePolling };
