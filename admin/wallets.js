const API_BASE = "https://backend-slxy.onrender.com";
const ADMIN_KEY = "foxpro_admin_2026";

async function loadWallets() {
  const res = await fetch(`${API_BASE}/admin/wallets`, {
    headers: { "x-admin-key": ADMIN_KEY }
  });
  const data = await res.json();

  const tbody = document.querySelector("#walletTable tbody");
  tbody.innerHTML = "";

  data.wallets.forEach(w => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${w.user_id}</td>
      <td>${w.username}</td>
      <td>${w.currency}</td>
      <td>${w.balance}</td>
      <td>${w.frozen}</td>
      <td>
        <button onclick="adjust(${w.user_id}, 100)">+100</button>
        <button onclick="adjust(${w.user_id}, -100)">-100</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function adjust(userId, amount) {
  if (!confirm(`确认 ${amount > 0 ? "增加" : "扣除"} ${Math.abs(amount)} USDT ?`)) return;

  await fetch(`${API_BASE}/admin/wallet/adjust`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY
    },
    body: JSON.stringify({ userId, amount })
  });

  loadWallets();
}

loadWallets();
