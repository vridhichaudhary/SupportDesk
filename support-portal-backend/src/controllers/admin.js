const { getAdminDashboardStats } = require("../services/adminStats");

async function adminStatsHandler(req, res) {
  try {
    const result = await getAdminDashboardStats();

    const stats = {
      total: result.total || 0,
      open: result.open || 0,
      inProgress: result.inProgress || 0,
      resolved: result.resolved || 0,
    };

    const recent = result.recent || [];

    return res.json({ stats, recent });
  } catch (err) {
    console.error("admin stats error:", err);
    return res.status(500).json({ message: "Failed to fetch admin stats" });
  }
}

module.exports = { adminStatsHandler };
