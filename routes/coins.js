router.get("/hot", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        symbol,
        name,
        icon,
        current_price,
        price_change
      FROM coins
      WHERE is_hot = true
      ORDER BY symbol ASC
      LIMIT 20
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load market data" });
  }
});
