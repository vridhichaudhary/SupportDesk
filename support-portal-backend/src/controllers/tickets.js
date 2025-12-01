const ticketsService = require("../services/tickets");
const { verifyToken } = require("../utils/authMiddleware");

async function createTicketHandler(req, res) {
  try {
    const authHeader = req.header("Authorization") || "";
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = verifyToken(token);

    const { title, description, category = "General", priority = "Low" } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const created = await ticketsService.createTicket({
      title,
      description,
      category,
      priority,
      userId: decoded.id,
    });

    return res.status(201).json({ ticket: created });
  } catch (err) {
    console.error("createTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to create ticket" });
  }
}

async function listTicketsHandler(req, res) {
  try {
    const { q, status, priority, category, sort, page = 1, limit = 20, mine } = req.query;
    let userId;
    if (mine === "true") {
      const authHeader = req.header("Authorization") || "";
      const token = authHeader.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });
      userId = verifyToken(token).id;
    }

    const result = await ticketsService.listTickets({
      q,
      status,
      priority,
      category,
      sort,
      page: Number(page),
      limit: Number(limit),
      userId,
    });

    res.json(result);
  } catch (err) {
    console.error("listTickets error:", err);
    res.status(500).json({ message: err.message || "Failed to list tickets" });
  }
}

async function updateTicketHandler(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await ticketsService.updateTicket(id, updates);

    if (!updated) return res.status(404).json({ message: "Ticket not found" });

    return res.json({ ticket: updated });
  } catch (err) {
    console.error("updateTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to update ticket" });
  }
}

async function dashboardStatsHandler(req, res) {
  try {
    const authHeader = req.header("Authorization") || "";
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = verifyToken(token);
    const stats = await ticketsService.getDashboardStatsForUser(decoded.id);
    res.json(stats);
  } catch (err) {
    console.error("dashboardStats error:", err);
    res.status(500).json({ message: err.message || "Failed to get dashboard stats" });
  }
}

module.exports = {
  createTicketHandler,
  listTicketsHandler,
  updateTicketHandler,
  dashboardStatsHandler,
};
