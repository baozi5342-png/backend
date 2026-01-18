const API = "https://你的-backend.onrender.com"; // 🔴 改成你的 Render 后端地址

// Tab 切换
document.querySelectorAll(".tab").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".card").forEach(c => c.style.display = "none");
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).style.display = "block";
  };
});

// ===== 秒合约产品 =====
async function loadProducts() {
  const r = await fetch(API + "/admin/seconds/products");
  const j = await r.json();
  if (!j.ok) return;

  const box = document.getElementById("products");
  box.innerHTML = "";

  j.data.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.symbol}</td>
      <td>${p.title}</td>
      <td>${p.payout_rate}</td>
      <td>${p.min_amount}</td>
      <td>${p.max_amount}</td>
      <td>${p.is_active ? "启用" : "停用"}</td>
      <td>
        <button class="${p.is_active ? "disable" : "enable"}"
          onclick="toggleProduct(${p.id}, ${!p.is_active})">
          ${p.is_active ? "停用" : "启用"}
        </button>
      </td>
    `;
    box.appendChild(tr);
  });
}

async function toggleProduct(id, is_active) {
  await fetch(API + "/admin/seconds/products/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active })
  });
  loadProducts();
}

// ===== 订单管理 =====
async function loadOrders() {
  const r = await fetch(API + "/admin/seconds/orders");
  const j = await r.json();
  if (!j.ok) return;

  const box = document.getElementById("orders");
  box.innerHTML = "";

  j.data.forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${o.id}</td>
      <td>${o.uid}</td>
      <td>${o.symbol}</td>
      <td>${o.direction === "UP" ? "买涨" : "买跌"}</td>
      <td>${o.amount}</td>
      <td>${o.status}</td>
      <td>${o.result || ""}</td>
      <td>${o.pnl || ""}</td>
    `;
    box.appendChild(tr);
  });
}

// ===== 风控 =====
async function loadRisk() {
  const r = await fetch(API + "/admin/risk");
  const j = await r.json();
  if (!j.ok) return;

  const d = j.data || {};
  document.getElementById("risk_enabled").value = d.is_trade_enabled;
  document.getElementById("risk_max_amount").value = d.max_amount_per_order;
  document.getElementById("risk_max_orders").value = d.max_orders_per_user_per_day;
  document.getElementById("risk_force_loss").value = d.force_loss_prob;
}

async function saveRisk() {
  await fetch(API + "/admin/risk", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      is_trade_enabled: document.getElementById("risk_enabled").value === "true",
      max_amount_per_order: Number(document.getElementById("risk_max_amount").value),
      max_orders_per_user_per_day: Number(document.getElementById("risk_max_orders").value),
      force_loss_prob: Number(document.getElementById("risk_force_loss").value)
    })
  });
  alert("风控设置已保存");
}

// 初始化
loadProducts();
loadOrders();
loadRisk();
