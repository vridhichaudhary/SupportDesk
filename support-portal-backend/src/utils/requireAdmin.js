const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  try {
    const authHeader = req.header("Authorization") || "";
    const token = authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden - Admin only" });
    }

    req.admin = decoded;
    next();

  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = requireAdmin;
