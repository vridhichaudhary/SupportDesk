const { createTicket, getTickets } = require("../services/tickets");

async function createTicketHandler(req, res) {
  try {
    // optional: attach req.user if using auth
    const body = req.body;
    if (!body.title || !body.description) {
      return res.status(400).json({ message: "title and description required" });
    }
    if (req.user && req.user.id) body.createdBy = req.user.id;
    const created = await createTicket(body);
    return res.status(201).json(created);
  } catch (err) {
    console.error("Create ticket error:", err);
    return res.status(500).json({ message: "Failed to create ticket" });
  }
}

async function listTicketsHandler(req, res) {
  try {
    // if you want user-only tickets: filter by req.user.id
    const filter = {};
    // if non-admin and you want only their tickets:
    if (req.user && req.user.role !== "admin") {
      filter.createdBy = req.user.id;
    }
    const tickets = await getTickets(filter);
    return res.json(tickets);
  } catch (err) {
    console.error("List tickets error:", err);
    return res.status(500).json({ message: "Failed to fetch tickets" });
  }
}

module.exports = { createTicketHandler, listTicketsHandler };
