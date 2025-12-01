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
    assignedTo: null,
    user: userId,
  });

  return await ticket.save();
}


async function listTickets(options = {}) {
  const {
    q,
    status,
    priority,
    category,
    sort = "-createdAt",
    page = 1,
    limit = 20,
    userId,
  } = options;

  const filter = {};

  if (userId) filter.user = userId;

  // Filtering
  if (status && status !== "all") filter.status = status;
  if (priority && priority !== "all") filter.priority = priority;
  if (category && category !== "all") filter.category = category;

  // Text search
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  // Sorting
  let sortOption = {};
  if (sort === "newest") sortOption.createdAt = -1;
  else if (sort === "oldest") sortOption.createdAt = 1;
  else if (sort === "priority-high") sortOption.priority = -1;
  else if (sort === "priority-low") sortOption.priority = 1;
  else if (sort === "status") sortOption.status = 1;
  else sortOption.createdAt = -1; 


  // Pagination
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Ticket.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
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


async function getDashboardStats(userId) {
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



module.exports = {
  createTicket,
  listTickets,
  getDashboardStats,
};
