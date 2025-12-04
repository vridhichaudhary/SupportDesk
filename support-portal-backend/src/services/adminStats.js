const Ticket = require("../models/Ticket");

async function getAdminStats() {
  const total = await Ticket.countDocuments();
  const open = await Ticket.countDocuments({ status: "open" });
  const inProgress = await Ticket.countDocuments({ status: "in-progress" });
  const resolved = await Ticket.countDocuments({ status: "resolved" });

  const categories = await Ticket.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } }
  ]);

  const recent = await Ticket.find()
    .sort({ createdAt: -1 })
    .limit(4)
    .populate("assignedTo", "name email")
    .lean();

  return {
    stats: {
      total,
      open,
      inProgress,
      resolved,
      categories
    },
    recent
  };
}

module.exports = { getAdminStats };
