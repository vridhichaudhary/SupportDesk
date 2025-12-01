const ticketsService = require("../services/tickets");
const { verifyToken } = require("../utils/authMiddleware");

async function createTicketHandler(req, res) {
  try {
    const user = req.user; 

    const { title, description, category, priority } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const created = await ticketsService.createTicket({
      title,
      description,
      category,
      priority,
      userId: user.id
    });

    return res.status(201).json({ ticket: created });
  } catch (err) {
    console.error("createTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to create ticket" });
  }
}

async function listTicketsHandler(req, res) {
  try {
    const { q, status, priority, category, sort, page, limit, mine } = req.query;

    let userId = undefined;
    if (mine === "true") {
      userId = req.user.id;
    }

    const result = await ticketsService.listTickets({
      q,
      status,
      priority,
      category,
      sort,
      page,
      limit,
      userId
    });

    return res.json(result);
  } catch (err) {
    console.error("listTickets error:", err);
    return res.status(500).json({ message: err.message || "Failed to list tickets" });
  }
}

async function updateTicketHandler(req, res) {
  try {
    const user = req.user;

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin only" });
    }

    const ticketId = req.params.id;
    const updateData = req.body;

    const updatedTicket = await ticketsService.updateTicket(ticketId, updateData);

    if (!updatedTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.json({ message: "Ticket updated", ticket: updatedTicket });
  } catch (err) {
    console.error("updateTicket error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  createTicketHandler,
  listTicketsHandler,
  updateTicketHandler
};
