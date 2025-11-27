const Ticket = require("../models/Ticket");

function generateTicketId() {
  return "TK-" + String(Date.now()).slice(-6);
}

async function createTicket({ title, description, category, priority, userId }) {
  const ticket = new Ticket({
    ticketId: generateTicketId(),
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
    q, status, priority, category, sort = "-createdAt",
    page = 1, limit = 20, userId
  } = options;

  const filter = {};
  if (userId) filter.user = userId;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  const query = Ticket.find(filter);

  if (q) {
    query.find({ $text: { $search: q } });
  }

  query.sort(sort);

  const skip = (Math.max(1, page) - 1) * limit;
  query.skip(skip).limit(parseInt(limit, 10));

  const [items, total] = await Promise.all([
    query.exec(),
    Ticket.countDocuments(filter).exec()
  ]);

  return {
    items,
    total,
    page: Number(page),
    limit: Number(limit)
  };
}

module.exports = { createTicket, listTickets };
