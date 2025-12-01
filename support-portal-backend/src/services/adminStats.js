const Ticket = require("../models/Ticket");

async function getAdminStats() {
  const total = await Ticket.countDocuments();
  const open = await Ticket.countDocuments({ status: "open" });
  const inProgress = await Ticket.countDocuments({ status: "in-progress" });
  const resolved = await Ticket.countDocuments({ status: "resolved" });

  const recent = await Ticket.find()
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  return { total, open, inProgress, resolved, recent };
}

module.exports = { getAdminStats };
