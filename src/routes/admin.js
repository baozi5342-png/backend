const express = require("express");
const { z } = require("zod");
const { pool } = require("../db/pool");

const router = express.Router();

function adminAuth(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_API_KEY) return res.status(401).json({ ok: false, message: "Unauthorized" });
  next();
}

router.get("/coins", adminAuth, async (req, res) => {
  const r = await pool.query(
    "SELECT symbol,name,icon,category,current_price AS \"currentPrice\",price_change AS \"priceChange\" FROM coins ORDER BY symbol ASC"
  );
  res.json({ ok: true, items: r.rows });
});

router.post("/coins", adminAuth, async (req, res) => {
  const schema = z.object({
    symbol: z.string().min(2).max(32),
    name: z.string().optional().default(""),
    icon: z.string().optional().default(""),
    category: z.string().min(3).max(16),
    currentPrice: z.number(),
    priceChange: z.number()
  });
  const b = schema.parse(req.body);

  await pool.query(
    `INSERT INTO coins(symbol,name,icon,category,current_price,price_change)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(symbol) DO UPDATE SET
       name=EXCLUDED.name, icon=EXCLUDED.icon, category=EXCLUDED.category,
       current_price=EXCLUDED.current_price, price_change=EXCLUDED.price_change`,
    [b.symbol, b.name, b.icon, b.category, b.currentPrice, b.priceChange]
  );

  res.json({ ok: true });
});

router.put("/coins/:symbol", adminAuth, async (req, res) => {
  const symbol = String(req.params.symbol || "").toUpperCase();
  const schema = z.object({
    symbol: z.string().min(2).max(32),
    name: z.string().optional().default(""),
    icon: z.string().optional().default(""),
    category: z.string().min(3).max(16),
    currentPrice: z.number(),
    priceChange: z.number()
  });
  const b = schema.parse(req.body);

  await pool.query(
    `UPDATE coins SET symbol=$1,name=$2,icon=$3,category=$4,current_price=$5,price_change=$6 WHERE symbol=$7`,
    [b.symbol, b.name, b.icon, b.category, b.currentPrice, b.priceChange, symbol]
  );

  res.json({ ok: true });
});

router.delete("/coins/:symbol", adminAuth, async (req, res) => {
  const symbol = String(req.params.symbol || "").toUpperCase();
  await pool.query("DELETE FROM coins WHERE symbol=$1", [symbol]);
  res.json({ ok: true });
});

module.exports = router;
