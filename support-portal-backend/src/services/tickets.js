const Ticket = require("../models/Ticket");
const Counter = require("../models/Counter");

async function generateSequentialTicketId() {
  const name = "ticket_sequence";
  const updated = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seq = updated.seq;
  return "TK-" + String(seq).padStart(3, "0");
}

async function createTicket({ title, description, category, priority, userId }) {
  const ticketId = await generateSequentialTicketId();

  const ticket = new Ticket({
    ticketId,
    title,
    description,
    category,
    priority,
    status: "open",
    user: userId,
    createdAt: new Date(),
  });

  return await ticket.save();
}

async function listTickets(options = {}) {
  const {
    q,
    status,
    priority,
    category,
    sort = "newest",
    page = 1,
    limit = 20,
    userId,
  } = options;

  const filter = {};
  if (userId) filter.user = userId;
  if (status && status !== "all") filter.status = status;
  if (priority && priority !== "all") filter.priority = priority;
  if (category && category !== "all") filter.category = category;
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  // sort mapping
  let sortOption = { createdAt: -1 };
  if (sort === "oldest") sortOption = { createdAt: 1 };
  else if (sort === "priority-high") sortOption = { priority: -1 };
  else if (sort === "priority-low") sortOption = { priority: 1 };

  const skip = (Math.max(1, page) - 1) * limit;

  const [items, total] = await Promise.all([
    Ticket.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate("user", "name email")
      .lean(),
    Ticket.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: Number(page),
    limit: Number(limit),
  };
}

async function getDashboardStatsForUser(userId) {
  const open = await Ticket.countDocuments({ user: userId, status: "open" });
  const inProgress = await Ticket.countDocuments({
    user: userId,
    status: "in-progress",
  });
  const resolved = await Ticket.countDocuments({
    user: userId,
    status: "resolved",
  });

  const recent = await Ticket.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  return { open, inProgress, resolved, recent };
}

async function updateTicket(ticketId, updates = {}) {
  return await Ticket.findByIdAndUpdate(ticketId, updates, { new: true }).lean();
}

module.exports = {
  createTicket,
  listTickets,
  getDashboardStatsForUser,
  updateTicket,
};
