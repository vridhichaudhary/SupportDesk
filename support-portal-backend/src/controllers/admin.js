const { getAdminDashboardStats } = require("../services/adminStats");

async function adminStatsHandler(req, res) {
  try {
    const stats = await getAdminDashboardStats();
    return res.json(stats);
  } catch (err) {
    console.error("admin stats error:", err);
    return res.status(500).json({ message: "Failed to fetch admin stats" });
  }
}

module.exports = { adminStatsHandler };
