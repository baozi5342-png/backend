const API_BASE = "https://backend-slxy.onrender.com";
const ADMIN_KEY = "foxpro_admin_2026";

async function loadOrders() {
  const res = await fetch(`${API_BASE}/admin/orders`, {
    headers: { "x-admin-key": ADMIN_KEY }
  });

  const data = await res.json();
  const tbody = document.querySelector("#ordersTable tbody");
  tbody.innerHTML = "";

  data.orders.forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${o.id}</td>
      <td>${o.username} (#${o.user_id})</td>
      <td>${o.symbol}</td>
      <td>${o.direction}</td>
      <td>${o.stake}</td>
      <td>${o.open_price || "-"}</td>
      <td>${o.close_price || "-"}</td>
      <td>${o.status}</td>
      <td>${o.result || "-"}</td>
      <td>${new Date(o.created_at).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

loadOrders();
