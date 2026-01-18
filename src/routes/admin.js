const express = require("express");
const router = express.Router();
const db = require("../db/pool");

/* =========================
   Admin Token 权限中间件
========================= */
function requireAdmin(req, res, next) {
  const need = String(process.env.ADMIN_TOKEN || "").trim();
  if (!need) return next(); // 未设置则放行（方便开发）

  const got =
    String(req.headers["x-admin-token"] || "").trim() ||
    String(req.query.token || "").trim();

  if (!got || got !== need) {
    return res.status(401).json({ ok: false, message: "未授权（Admin Token 错误）" });
  }
  next();
}

router.use(requireAdmin);

const ok = (res, data) => res.json({ ok: true, data });
const bad = (res, msg, code = 400) =>
  res.status(code).json({ ok: false, message: msg });

/* =========================
   1️⃣ 秒合约产品管理
========================= */

// 获取全部产品
router.get("/seconds/products", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM seconds_products ORDER BY id DESC"
    );
    ok(res, rows);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// 新增产品
router.post("/seconds/products", async (req, res) => {
  try {
    const {
      symbol,
      title,
      min_amount = 10,
      max_amount = 10000,
      payout_rate = 0.85,
      durations = [30, 60, 120],
      is_active = true,
    } = req.body;

    if (!symbol || !title) return bad(res, "symbol / title 不能为空");

    const { rows } = await db.query(
      `
      INSERT INTO seconds_products
      (symbol, title, min_amount, max_amount, payout_rate, durations, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        String(symbol).toUpperCase(),
        title,
        Number(min_amount),
        Number(max_amount),
        Number(payout_rate),
        durations,
        Boolean(is_active),
      ]
    );

    ok(res, rows[0]);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// 更新产品
router.put("/seconds/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      symbol,
      title,
      min_amount,
      max_amount,
      payout_rate,
      durations,
      is_active,
    } = req.body;

    const { rows } = await db.query(
      `
      UPDATE seconds_products
      SET symbol = COALESCE($1, symbol),
          title = COALESCE($2, title),
          min_amount = COALESCE($3, min_amount),
          max_amount = COALESCE($4, max_amount),
          payout_rate = COALESCE($5, payout_rate),
          durations = COALESCE($6, durations),
          is_active = COALESCE($7, is_active),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
      `,
      [
        symbol ? String(symbol).toUpperCase() : null,
        title ?? null,
        min_amount ?? null,
        max_amount ?? null,
        payout_rate ?? null,
        durations ?? null,
        is_active ?? null,
        id,
      ]
    );

    if (!rows[0]) return bad(res, "产品不存在", 404);
    ok(res, rows[0]);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

/* =========================
   2️⃣ 订单管理（高级筛选）
========================= */

// GET /admin/seconds/orders?uid=&status=&symbol=&from=&to=
router.get("/seconds/orders", async (req, res) => {
  try {
    const { uid, status, symbol, from, to } = req.query;
    const where = [];
    const params = [];

    if (uid) {
      params.push(uid);
      where.push(`uid = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (symbol) {
      params.push(symbol.toUpperCase());
      where.push(`symbol = $${params.length}`);
    }
    if (from) {
      params.push(from);
      where.push(`created_at >= $${params.length}::timestamp`);
    }
    if (to) {
      params.push(to);
      where.push(`created_at <= $${params.length}::timestamp`);
    }

    const sql =
      `SELECT * FROM seconds_orders` +
      (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
      ` ORDER BY id DESC LIMIT 200`;

    const { rows } = await db.query(sql, params);
    ok(res, rows);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

/* =========================
   3️⃣ 强制赢 / 强制输
========================= */

router.post("/seconds/orders/:id/force", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { result } = req.body;

    if (!["WIN", "LOSE"].includes(result))
      return bad(res, "result 必须是 WIN 或 LOSE");

    const { rows } = await db.query(
      "SELECT * FROM seconds_orders WHERE id=$1",
      [id]
    );
    const order = rows[0];
    if (!order) return bad(res, "订单不存在", 404);
    if (order.status !== "OPEN")
      return bad(res, "订单已结算，不能操作");

    const amount = Number(order.amount);
    const payout = Number(order.payout_rate || 0.85);
    const pnl = result === "WIN" ? amount * payout : -amount;

    await db.query(
      `
      UPDATE seconds_orders
      SET status='SETTLED',
          result=$1,
          pnl=$2,
          exit_price=entry_price,
          settled_at=NOW()
      WHERE id=$3
      `,
      [result, pnl, id]
    );

    ok(res, true);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

/* =========================
   4️⃣ 风控设置
========================= */

router.get("/risk", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM risk_settings WHERE id=1"
    );
    ok(res, rows[0] || {});
  } catch (e) {
    bad(res, e.message, 500);
  }
});

router.put("/risk", async (req, res) => {
  try {
    const {
      is_trade_enabled,
      max_amount_per_order,
      max_orders_per_user_per_day,
      force_loss_prob,
    } = req.body;

    await db.query(
      `INSERT INTO risk_settings (id) VALUES (1)
       ON CONFLICT (id) DO NOTHING`
    );

    const { rows } = await db.query(
      `
      UPDATE risk_settings
      SET is_trade_enabled=$1,
          max_amount_per_order=$2,
          max_orders_per_user_per_day=$3,
          force_loss_prob=$4,
          updated_at=NOW()
      WHERE id=1
      RETURNING *
      `,
      [
        Boolean(is_trade_enabled),
        Number(max_amount_per_order),
        Number(max_orders_per_user_per_day),
        Number(force_loss_prob),
      ]
    );

    ok(res, rows[0]);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

/* =========================
   5️⃣ 今日统计
========================= */

router.get("/stats/today", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*)::int AS total_orders,
        COUNT(*) FILTER (WHERE status='OPEN')::int AS open_orders,
        COUNT(*) FILTER (WHERE status='SETTLED')::int AS settled_orders,
        COUNT(*) FILTER (WHERE result='WIN')::int AS win_orders,
        COUNT(*) FILTER (WHERE result='LOSE')::int AS lose_orders,
        COALESCE(SUM(pnl) FILTER (WHERE status='SETTLED'), 0) AS total_pnl
      FROM seconds_orders
      WHERE created_at::date = NOW()::date
    `);
    ok(res, rows[0]);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

module.exports = router;
