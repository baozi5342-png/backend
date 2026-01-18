module.exports = function (req, res, next) {
  // ✅ 放行首页/市场行情接口（不需要登录）
  if (
    req.path.startsWith("/api/coins") ||
    req.path.startsWith("/coins")
  ) {
    return next();
  }

  // ⛔ 下面才是需要登录的接口
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: "未登录" });
  }

  next();
};
