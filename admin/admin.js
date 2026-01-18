(() => {
  // ✅ 自动识别 API Base（本地 http://localhost:3000 或 Render 域名）
  const API_BASE = location.origin; // 同域：你访问哪，就用哪的 /api
  document.getElementById("apiBasePill").textContent = `API: ${API_BASE}/api`;

  const $thead = document.getElementById("thead");
  const $tbody = document.getElementById("tbody");
  const $title = document.getElementById("panelTitle");
  const $search = document.getElementById("searchInput");
  const $toast = document.getElementById("toast");

  let currentTab = "coins";
  let rawData = [];

  const tabsMeta = {
    coins: { title: "Coins", url: "/api/coins" },
    users: { title: "Users", url: "/api/users" },
    contracts: { title: "Contracts", url: "/api/contracts" },
    withdraw: { title: "Withdraw", url: "/api/withdraw" },
  };

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => $toast.classList.remove("show"), 1600);
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${txt}`);
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  }

  function pickColumns(tab, rows) {
    // 尽量按常见字段排序展示；如果表字段不同，也能展示出来
    const common = {
      coins: ["id", "symbol", "name", "is_disabled", "created_at", "updated_at"],
      users: ["id", "email", "username", "balance", "available", "frozen", "is_disabled", "status", "created_at"],
      contracts: ["id", "symbol", "name", "period", "duration", "profit_rate", "payout_rate", "min_amount", "max_amount", "is_disabled", "status", "created_at"],
      withdraw: ["id", "user_id", "uid", "coin", "symbol", "network", "address", "amount", "fee", "status", "created_at"],
    }[tab] || [];

    const keys = new Set();
    rows.forEach(r => Object.keys(r || {}).forEach(k => keys.add(k)));

    // 先用 common 中存在的字段，再把剩余字段补上
    const cols = [];
    common.forEach(k => { if (keys.has(k)) cols.push(k); });
    [...keys].forEach(k => { if (!cols.includes(k)) cols.push(k); });

    // 最后加 Actions
    cols.push("__actions__");
    return cols;
  }

  function badgeFor(value) {
    const v = String(value ?? "").toLowerCase();
    if (v === "approved" || v === "success" || v === "0" || v === "false" || v === "enabled") {
      return `<span class="badge on">${value}</span>`;
    }
    if (v === "rejected" || v === "fail" || v === "1" || v === "true" || v === "disabled") {
      return `<span class="badge off">${value}</span>`;
    }
    if (v === "pending" || v === "review") {
      return `<span class="badge pending">${value}</span>`;
    }
    return `<span class="badge">${value ?? ""}</span>`;
  }

  function formatCell(tab, key, val) {
    if (key === "is_disabled") return badgeFor(val ? "disabled" : "enabled");
    if (key === "status") return badgeFor(val);
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  }

  function getId(row) {
    return row.id ?? row.ID ?? row.Id;
  }

  function renderTable(tab, rows) {
    const cols = pickColumns(tab, rows);

    $thead.innerHTML = `
      <tr>
        ${cols.map(c => `<th>${c === "__actions__" ? "actions" : c}</th>`).join("")}
      </tr>
    `;

    const q = ($search.value || "").trim().toLowerCase();
    const filtered = !q ? rows : rows.filter(r => JSON.stringify(r).toLowerCase().includes(q));

    $tbody.innerHTML = filtered.map(row => {
      const id = getId(row);

      return `
        <tr data-id="${id}">
          ${cols.map(c => {
            if (c === "__actions__") return `<td>${renderActions(tab, row)}</td>`;
            return `<td>${formatCell(tab, c, row[c])}</td>`;
          }).join("")}
        </tr>
      `;
    }).join("");
  }

  function renderActions(tab, row) {
    const id = getId(row);

    if (!id) return `<span class="badge">no id</span>`;

    // coins/users: toggle is_disabled
    if (tab === "coins" || tab === "users") {
      const disabled = !!row.is_disabled;
      return `
        <div class="inline">
          <button class="btn small ${disabled ? "green" : "red"}" data-act="toggle" data-id="${id}" data-disabled="${disabled ? 0 : 1}">
            ${disabled ? "Enable" : "Disable"}
          </button>
        </div>
      `;
    }

    // contracts: update profit_rate + toggle
    if (tab === "contracts") {
      const disabled = !!row.is_disabled;

      // 兼容 profit_rate / payout_rate
      const pr = row.profit_rate ?? row.payout_rate ?? "";

      return `
        <div class="inline">
          <input class="cell-input" data-field="profit_rate" value="${pr}" placeholder="profit_rate" />
          <button class="btn small blue" data-act="update-contract" data-id="${id}">Save</button>
          <button class="btn small ${disabled ? "green" : "red"}" data-act="toggle-contract" data-id="${id}" data-disabled="${disabled ? 0 : 1}">
            ${disabled ? "Enable" : "Disable"}
          </button>
        </div>
      `;
    }

    // withdraw: review approve/reject
    if (tab === "withdraw") {
      const status = String(row.status ?? "").toLowerCase();
      const already = status === "approved" || status === "rejected";
      return `
        <div class="inline">
          <button class="btn small green" ${already ? "disabled" : ""} data-act="withdraw-approve" data-id="${id}">Approve</button>
          <button class="btn small red" ${already ? "disabled" : ""} data-act="withdraw-reject" data-id="${id}">Reject</button>
        </div>
      `;
    }

    return `<span class="badge">-</span>`;
  }

  async function loadTab(tab) {
    currentTab = tab;
    $title.textContent = tabsMeta[tab].title;
    $search.value = "";

    try {
      const data = await apiFetch(tabsMeta[tab].url);
      rawData = Array.isArray(data) ? data : [];
      renderTable(tab, rawData);
      toast(`${tabsMeta[tab].title} loaded: ${rawData.length}`);
    } catch (e) {
      console.error(e);
      $thead.innerHTML = "";
      $tbody.innerHTML = `<tr><td style="padding:16px">Load failed: ${e.message}</td></tr>`;
      toast("Load failed");
    }
  }

  // 事件：左侧切换 tab
  document.querySelectorAll(".nav").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      loadTab(btn.dataset.tab);
    });
  });

  // 搜索过滤
  $search.addEventListener("input", () => renderTable(currentTab, rawData));

  // Refresh
  document.getElementById("btnRefresh").addEventListener("click", () => loadTab(currentTab));

  // 表格按钮事件（事件委托）
  $tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const act = btn.dataset.act;
    const id = btn.dataset.id;

    try {
      // coins/users toggle
      if (act === "toggle") {
        const is_disabled = btn.dataset.disabled === "1";
        const path = currentTab === "coins" ? "/api/coins/toggle" : "/api/users/toggle";
        await apiFetch(path, {
          method: "POST",
          body: JSON.stringify({ id: Number(id), is_disabled }),
        });
        toast("Saved");
        await loadTab(currentTab);
        return;
      }

      // contracts: save profit_rate + is_disabled keep
      if (act === "update-contract") {
        const tr = btn.closest("tr");
        const input = tr.querySelector('input[data-field="profit_rate"]');
        const profit_rate = input ? input.value : "";

        // 保持当前禁用状态（从原始数据找）
        const row = rawData.find(r => String(getId(r)) === String(id)) || {};
        const is_disabled = !!row.is_disabled;

        await apiFetch("/api/contracts/update", {
          method: "POST",
          body: JSON.stringify({ id: Number(id), profit_rate, is_disabled }),
        });
        toast("Saved");
        await loadTab(currentTab);
        return;
      }

      if (act === "toggle-contract") {
        const is_disabled = btn.dataset.disabled === "1";
        // 从输入框取 profit_rate（避免切换时把profit清空）
        const tr = btn.closest("tr");
        const input = tr.querySelector('input[data-field="profit_rate"]');
        const profit_rate = input ? input.value : "";

        await apiFetch("/api/contracts/update", {
          method: "POST",
          body: JSON.stringify({ id: Number(id), profit_rate, is_disabled }),
        });
        toast("Saved");
        await loadTab(currentTab);
        return;
      }

      // withdraw review
      if (act === "withdraw-approve" || act === "withdraw-reject") {
        const status = act === "withdraw-approve" ? "approved" : "rejected";
        await apiFetch("/api/withdraw/review", {
          method: "POST",
          body: JSON.stringify({ id: Number(id), status }),
        });
        toast("Reviewed");
        await loadTab(currentTab);
        return;
      }
    } catch (err) {
      console.error(err);
      toast(`Failed: ${err.message}`);
    }
  });

  // 首次加载
  loadTab("coins");
})();
