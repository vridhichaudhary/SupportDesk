const ticketsService = require("../services/tickets");
const { verifyToken } = require("../utils/authMiddleware");

async function createTicketHandler(req, res) {
  try {
    const authHeader = req.header("Authorization") || "";
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = verifyToken(token);

    const { title, description, category, priority } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const created = await ticketsService.createTicket({
      title,
      description,
      category,
      priority,
      userId: decoded.id
    });

    await created.populate("user", "name email").execPopulate?.() || null;

    return res.status(201).json({ ticket: created });
  } catch (err) {
    console.error("createTicket error:", err);
    return res.status(500).json({ message: err.message || "Failed to create ticket" });
  }
}

async function listTicketsHandler(req, res) {
  try {
    const { q, status, priority, category, sort, page = 1, limit = 20, mine } = req.query;

    let userId = undefined;
    if (mine === "true") {
      const authHeader = req.header("Authorization") || "";
      const token = authHeader.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });
      const decoded = verifyToken(token);
      userId = decoded.id;
    }

    const result = await ticketsService.listTickets({
      q,
      status,
      priority,
      category,
      sort: sort || "-createdAt",
      page: Number(page),
      limit: Number(limit),
      userId
    });

    return res.json(result);
  } catch (err) {
    console.error("listTickets error:", err);
    return res.status(500).json({ message: err.message || "Failed to list tickets" });
  }
}

module.exports = { createTicketHandler, listTicketsHandler };
