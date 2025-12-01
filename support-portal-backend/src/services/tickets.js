const Ticket = require("../models/Ticket");
const Counter = require("../models/Counter");

async function generateSequentialTicketId() {
  const name = "ticket";

  const updated = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const seq = updated.seq;
  return "TK-" + String(seq).padStart(3, "0");
}


async function createTicket({ title, description, category, priority, userId }) {
  const ticket = new Ticket({
    ticketId: await generateSequentialTicketId(),  
    title,
    description,
    category,
    priority,
    user: userId,
  });

  const saved = await ticket.save();
  return saved;
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
    userId
  } = options;

  const filter = {};

  if (userId) filter.user = userId;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  let query = Ticket.find(filter).populate("user", "name email");

  if (q) {
    query = query.find({
      title: new RegExp(q, "i")
    });
  }

  // Sorting
  query = query.sort(sort);

  // Pagination
  const skip = (Math.max(1, page) - 1) * limit;
  query = query.skip(skip).limit(parseInt(limit, 10));

  const [items, total] = await Promise.all([
    query.exec(),
    Ticket.countDocuments(filter).exec()
  ]);

  return {
    items,
    total,
    page: Number(page),
    limit: Number(limit),
  };
}

async function updateTicket(ticketId, data) {
  const updated = await Ticket.findByIdAndUpdate(
    ticketId,
    data,
    { new: true }
  );

  return updated;
}

module.exports = {
  createTicket,
  listTickets,
  generateSequentialTicketId,
  updateTicket
};
