const Ticket = require("../models/Ticket");

async function getAdminDashboardStats() {
  const total = await Ticket.countDocuments();
  const open = await Ticket.countDocuments({ status: "open" });
  const inProgress = await Ticket.countDocuments({ status: "in-progress" });
  const resolved = await Ticket.countDocuments({ status: "resolved" });

  const recent = await Ticket.find()
    .sort({ createdAt: -1 })
    .limit(4)
    .lean();

  return { total, open, inProgress, resolved, recent };
}

module.exports = { getAdminDashboardStats };
