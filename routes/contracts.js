const express = require("express");
const router = express.Router();
const db = require("../db");

/* 产品列表 */
router.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT * FROM contract_products ORDER BY id DESC"
  );
  res.json(result.rows);
});

/* 修改产品 */
router.post("/update", async (req, res) => {
  const { id, profit_rate, is_disabled } = req.body;

  await db.query(
    "UPDATE contract_products SET profit_rate=$1, is_disabled=$2 WHERE id=$3",
    [profit_rate, is_disabled, id]
  );

  res.json({ success: true });
});

module.exports = router;
