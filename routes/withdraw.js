const express = require("express");
const router = express.Router();
const db = require("../config/db");

/* 提现列表 */
router.get("/", async (req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM withdraw_requests ORDER BY id DESC"
  );
  res.json(rows);
});

/* 审核 */
router.post("/review", async (req, res) => {
  const { id, status } = req.body; // approved / rejected

  await db.query(
    "UPDATE withdraw_requests SET status=$1 WHERE id=$2",
    [status, id]
  );

  res.json({ success: true });
});

module.exports = router;
