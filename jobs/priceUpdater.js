<script>
const API = "https://backend-slxy.onrender.com/api";

async function loadHotMarkets() {
  const table = document.getElementById("marketTable");
  table.innerHTML = `
    <div class="market-row header">
      <div>#</div>
      <div>Asset</div>
      <div class="price">Price</div>
      <div class="change">24h</div>
    </div>
  `;

  try {
    const res = await fetch(API + "/markets/hot");
    const data = await res.json();

    data.forEach((c, i) => {
      const up = Number(c.price_change) >= 0;

      table.innerHTML += `
        <div class="market-row">
          <div>${i + 1}</div>
          <div class="symbol">
            <img src="${c.icon}" style="width:20px;vertical-align:middle;margin-right:6px;">
            ${c.symbol}/USDT
          </div>
          <div class="price">$${Number(c.current_price).toFixed(2)}</div>
          <div class="change ${up ? "up" : "down"}">
            ${up ? "+" : ""}${Number(c.price_change).toFixed(2)}%
          </div>
        </div>
      `;
    });

  } catch (e) {
    table.innerHTML += `
      <div class="market-row">
        <div style="grid-column:1/5;color:#ef4444">
          Failed to load market data
        </div>
      </div>
    `;
  }
}

// 首次加载
loadHotMarkets();

// 每 5 秒刷新（实时感）
setInterval(loadHotMarkets, 5000);
</script>
