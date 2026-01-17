const API_BASE = "https://backend-slxy.onrender.com";
const ADMIN_KEY = "foxpro_admin_2026";

async function loadCoins() {
  const res = await fetch(`${API_BASE}/admin/coins`, {
    headers: { "x-admin-key": ADMIN_KEY }
  });
  const data = await res.json();

  const tbody = document.querySelector("#coinsTable tbody");
  tbody.innerHTML = "";

  data.coins.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.symbol}</td>
      <td>${c.name}</td>
      <td>${c.category}</td>
      <td>
        <input id="price-${c.symbol}" value="${c.current_price}" style="width:80px">
      </td>
      <td>
        <input id="change-${c.symbol}" value="${c.price_change}" style="width:60px">
      </td>
      <td>
        <button onclick="updateCoin('${c.symbol}')">更新</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function updateCoin(symbol) {
  const price = document.getElementById(`price-${symbol}`).value;
  const change = document.getElementById(`change-${symbol}`).value;

  await fetch(`${API_BASE}/admin/coins/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY
    },
    body: JSON.stringify({
      symbol,
      price: Number(price),
      change: Number(change)
    })
  });

  alert("已更新");
}

loadCoins();
