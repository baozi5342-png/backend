/**
 * FoxPro 后台（中文）
 * - 秒合约产品管理：列表/新增/编辑/启用停用
 * - 用户管理/风控限制：封号/启用、单笔限额、每日限额、每日最大亏损
 *
 * 注意：不提供/不实现“强制输赢、控制胜率”等操纵交易结果功能。
 */

// ====== 默认配置（可在“接口设置”里保存覆盖） ======
const DEFAULT_API_BASE = "https://backend-slxy.onrender.com"; // 你现在的后端示例
const DEFAULT_ADMIN_KEY = "foxpro_admin_2026";

// ====== 读取本地配置 ======
function getCfg() {
  const apiBase = localStorage.getItem("ADMIN_API_BASE") || DEFAULT_API_BASE;
  const adminKey = localStorage.getItem("ADMIN_KEY") || DEFAULT_ADMIN_KEY;
  return { apiBase: apiBase.replace(/\/$/, ""), adminKey };
}

// ====== 通用请求封装 ======
async function api(path, options = {}) {
  const { apiBase, adminKey } = getCfg();
  const url = (apiBase ? apiBase : "") + path;

  const headers = {
    "x-admin-key": adminKey,
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const msg = (data && data.message) ? data.message : (typeof data === "string" ? data : "请求失败");
    throw new Error(msg);
  }

  return data;
}

// ====== UI 小工具 ======
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

function toast(msg, type = "ok") {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  el.classList.toggle("danger", type === "danger");
  setTimeout(() => el.classList.add("hidden"), 2200);
}

function setActivePage(page) {
  $all(".menu-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  $all(".page").forEach(p => p.classList.add("hidden"));
  $("#page-" + page).classList.remove("hidden");

  if (page === "products") {
    $("#pageTitle").textContent = "秒合约产品管理";
    $("#pageSub").textContent = "新增/编辑秒数、盈利比例、金额限制、启用停用";
  } else if (page === "users") {
    $("#pageTitle").textContent = "用户管理 / 风控限制";
    $("#pageSub").textContent = "封号/启用 + 单笔/每日/亏损限制";
  } else {
    $("#pageTitle").textContent = "接口设置";
    $("#pageSub").textContent = "配置后端地址与管理密钥";
  }
}

function openModal() { $("#productModal").classList.remove("hidden"); }
function closeModal() { $("#productModal").classList.add("hidden"); }

function fillCfgUI() {
  const { apiBase, adminKey } = getCfg();
  $("#cfgApiBase").value = apiBase;
  $("#cfgAdminKey").value = adminKey;
}

// ====== 产品管理 ======
let editingProductId = null;

async function loadProducts() {
  const tbody = $("#productsTable tbody");
  tbody.innerHTML = `<tr><td colspan="7" class="muted">加载中...</td></tr>`;

  try {
    // 你原来已有的接口：GET /admin/contract-products
    const list = await api("/admin/contract-products", { method: "GET" });

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted">暂无产品</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    list.forEach(p => {
      const ratioText = (p.payout_ratio != null) ? `${(Number(p.payout_ratio) * 100).toFixed(0)}%` : "-";
      const statusTag = (p.status === "ACTIVE") ? `<span class="tag ok">启用</span>` : `<span class="tag">停用</span>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.id ?? "-"}</td>
        <td>${p.seconds ?? "-"}</td>
        <td>${ratioText}</td>
        <td>${p.min_amount ?? "-"}</td>
        <td>${p.max_amount ?? "-"}</td>
        <td>${statusTag}</td>
        <td>
          <button class="btn small" data-act="edit" data-id="${p.id}">编辑</button>
          <button class="btn ghost small" data-act="toggle" data-id="${p.id}" data-status="${p.status}">
            ${p.status === "ACTIVE" ? "停用" : "启用"}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted">加载失败：${e.message}</td></tr>`;
    toast("产品加载失败：" + e.message, "danger");
  }
}

function openCreateProduct() {
  editingProductId = null;
  $("#productModalTitle").textContent = "新增产品";
  $("#pId").value = "";
  $("#pSeconds").value = "";
  $("#pRatio").value = "";
  $("#pMin").value = "";
  $("#pMax").value = "";
  $("#pStatus").value = "ACTIVE";
  openModal();
}

async function openEditProduct(productId) {
  // 为了不依赖额外接口，这里从表格行读取数据
  const row = Array.from($("#productsTable tbody").children).find(tr => tr.children[0].textContent == String(productId));
  if (!row) return;

  editingProductId = productId;
  $("#productModalTitle").textContent = "编辑产品";
  $("#pId").value = String(productId);

  const seconds = row.children[1].textContent;
  const ratio = row.children[2].textContent.replace("%", "");
  const minA = row.children[3].textContent;
  const maxA = row.children[4].textContent;

  $("#pSeconds").value = seconds === "-" ? "" : Number(seconds);
  $("#pRatio").value = ratio === "-" ? "" : (Number(ratio) / 100);
  $("#pMin").value = minA === "-" ? "" : Number(minA);
  $("#pMax").value = maxA === "-" ? "" : Number(maxA);

  // 状态从按钮 data-status 取更准确
  const toggleBtn = row.querySelector('button[data-act="toggle"]');
  $("#pStatus").value = toggleBtn?.dataset?.status || "ACTIVE";

  openModal();
}

async function saveProduct() {
  const seconds = Number($("#pSeconds").value);
  const payout_ratio = Number($("#pRatio").value);
  const min_amount = Number($("#pMin").value);
  const max_amount = Number($("#pMax").value);
  const status = $("#pStatus").value;

  if (!seconds || seconds < 1) return toast("秒数必须大于 0", "danger");
  if (!(payout_ratio >= 0)) return toast("盈利比例必须是数字", "danger");
  if (!(min_amount >= 0)) return toast("最小金额必须是数字", "danger");
  if (!(max_amount >= min_amount)) return toast("最大金额必须 >= 最小金额", "danger");

  const payload = { seconds, payout_ratio, min_amount, max_amount, status };

  try {
    /**
     * 你后端如果还没有这两个接口，需要你补：
     * - POST /admin/contract-products
     * - PUT  /admin/contract-products/:id
     *
     * 如果你已经有了，下面直接可用。
     */
    if (editingProductId == null) {
      await api("/admin/contract-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      toast("新增成功");
    } else {
      await api(`/admin/contract-products/${editingProductId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      toast("保存成功");
    }

    closeModal();
    await loadProducts();
  } catch (e) {
    toast("保存失败：" + e.message, "danger");
  }
}

async function toggleProduct(productId, currentStatus) {
  const next = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
  try {
    await api(`/admin/contract-products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next })
    });
    toast(next === "ACTIVE" ? "已启用" : "已停用");
    await loadProducts();
  } catch (e) {
    toast("操作失败：" + e.message, "danger");
  }
}

// ====== 用户 / 风控限制 ======
async function loadUsers(keyword = "") {
  const tbody = $("#usersTable tbody");
  tbody.innerHTML = `<tr><td colspan="7" class="muted">加载中...</td></tr>`;

  try {
    /**
     * 你原来已有：GET /admin/users
     * 如果你后端支持搜索，可改为：/admin/users?keyword=xxx
     */
    const url = keyword ? `/admin/users?keyword=${encodeURIComponent(keyword)}` : "/admin/users";
    const list = await api(url, { method: "GET" });

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted">暂无用户</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    list.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.id ?? "-"}</td>
        <td>${u.username ?? "-"}</td>
        <td>
          <select class="input small" data-k="status" data-id="${u.id}">
            <option value="ACTIVE" ${u.status === "ACTIVE" ? "selected" : ""}>正常</option>
            <option value="BANNED" ${u.status === "BANNED" ? "selected" : ""}>封号</option>
            <option value="DISABLED" ${u.status === "DISABLED" ? "selected" : ""}>禁用</option>
          </select>
        </td>
        <td><input class="input small" data-k="max_per_order" data-id="${u.id}" type="number" step="0.01" min="0" value="${u.max_per_order ?? ""}" placeholder="不限制"></td>
        <td><input class="input small" data-k="max_daily_amount" data-id="${u.id}" type="number" step="0.01" min="0" value="${u.max_daily_amount ?? ""}" placeholder="不限制"></td>
        <td><input class="input small" data-k="max_daily_loss" data-id="${u.id}" type="number" step="0.01" min="0" value="${u.max_daily_loss ?? ""}" placeholder="不限制"></td>
        <td>
          <button class="btn small" data-act="saveUser" data-id="${u.id}">保存</button>
          <button class="btn ghost small" data-act="resetUser" data-id="${u.id}">清空限制</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted">加载失败：${e.message}</td></tr>`;
    toast("用户加载失败：" + e.message, "danger");
  }
}

function readUserRow(userId) {
  const status = document.querySelector(`[data-k="status"][data-id="${userId}"]`)?.value || "ACTIVE";
  const max_per_order = document.querySelector(`[data-k="max_per_order"][data-id="${userId}"]`)?.value;
  const max_daily_amount = document.querySelector(`[data-k="max_daily_amount"][data-id="${userId}"]`)?.value;
  const max_daily_loss = document.querySelector(`[data-k="max_daily_loss"][data-id="${userId}"]`)?.value;

  function toNumOrNull(v) {
    if (v == null) return null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  return {
    status,
    max_per_order: toNumOrNull(max_per_order),
    max_daily_amount: toNumOrNull(max_daily_amount),
    max_daily_loss: toNumOrNull(max_daily_loss),
  };
}

async function saveUser(userId) {
  const payload = readUserRow(userId);

  try {
    /**
     * 这里建议你的后端提供一个合规接口，例如：
     * PUT /admin/users/:id/risk
     * body: { status, max_per_order, max_daily_amount, max_daily_loss }
     *
     * 你之前已有 /admin/users/:id/risk，我们沿用它。
     */
    await api(`/admin/users/${userId}/risk`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    toast("已保存");
    await loadUsers($("#userSearch").value.trim());
  } catch (e) {
    toast("保存失败：" + e.message, "danger");
  }
}

async function resetUser(userId) {
  try {
    await api(`/admin/users/${userId}/risk`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: document.querySelector(`[data-k="status"][data-id="${userId}"]`)?.value || "ACTIVE",
        max_per_order: null,
        max_daily_amount: null,
        max_daily_loss: null
      })
    });
    toast("已清空限制");
    await loadUsers($("#userSearch").value.trim());
  } catch (e) {
    toast("操作失败：" + e.message, "danger");
  }
}

// ====== 设置页 ======
function saveCfg() {
  const apiBase = $("#cfgApiBase").value.trim();
  const adminKey = $("#cfgAdminKey").value.trim();

  localStorage.setItem("ADMIN_API_BASE", apiBase);
  localStorage.setItem("ADMIN_KEY", adminKey);

  toast("已保存设置");
}

function resetCfg() {
  localStorage.removeItem("ADMIN_API_BASE");
  localStorage.removeItem("ADMIN_KEY");
  fillCfgUI();
  toast("已恢复默认");
}

// ====== 事件绑定 ======
function bindEvents() {
  $all(".menu-item").forEach(btn => {
    btn.addEventListener("click", async () => {
      const page = btn.dataset.page;
      setActivePage(page);

      if (page === "products") await loadProducts();
      if (page === "users") await loadUsers();
      if (page === "settings") fillCfgUI();
    });
  });

  $("#btnRefresh").addEventListener("click", async () => {
    const active = $(".menu-item.active")?.dataset?.page || "products";
    if (active === "products") await loadProducts();
    if (active === "users") await loadUsers($("#userSearch").value.trim());
    if (active === "settings") fillCfgUI();
  });

  // 产品弹窗
  $("#btnOpenCreateProduct").addEventListener("click", openCreateProduct);
  $("#btnSaveProduct").addEventListener("click", saveProduct);

  // 弹窗关闭
  $("#productModal").addEventListener("click", (e) => {
    if (e.target.dataset.close === "1") closeModal();
  });

  // 产品表格按钮（事件代理）
  $("#productsTable").addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const act = btn.dataset.act;
    const id = btn.dataset.id;

    if (act === "edit") {
      await openEditProduct(id);
    } else if (act === "toggle") {
      await toggleProduct(id, btn.dataset.status);
    }
  });

  // 用户表格按钮（事件代理）
  $("#usersTable").addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const act = btn.dataset.act;
    const id = btn.dataset.id;

    if (act === "saveUser") await saveUser(id);
    if (act === "resetUser") await resetUser(id);
  });

  // 搜索
  $("#btnSearchUser").addEventListener("click", async () => {
    await loadUsers($("#userSearch").value.trim());
  });

  // 设置
  $("#btnSaveCfg").addEventListener("click", saveCfg);
  $("#btnResetCfg").addEventListener("click", resetCfg);
}

// ====== 初始化 ======
(async function init() {
  bindEvents();
  setActivePage("products");
  await loadProducts();
})();
