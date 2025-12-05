const ticketsService = require("../services/tickets");
const { verifyToken } = require("../utils/authMiddleware");
const Ticket = require("../models/Ticket");
const Agent = require("../models/Agent");


async function createTicketHandler(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
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

    res.status(201).json({ ticket: created });
  } catch (err) {
    console.error("createTicket error:", err);
    res.status(500).json({ message: "Failed to create ticket" });
  }
}


async function listTicketsHandler(req, res) {
  try {
    const { q, status, priority, category, sort, page = 1, limit = 20, mine } = req.query;

    let userId = null;
    if (mine === "true") {
      const token = req.headers.authorization?.split(" ")[1];
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
    res.status(500).json({ message: "Failed to list tickets" });
  }
}


async function updateTicketHandler(req, res) {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { assignedTo: req.body.assignedTo },
      { new: true }
    ).populate("assignedTo", "name");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    return res.json({ ticket });
  } catch (err) {
    console.error("update ticket error:", err);
    return res.status(500).json({ message: "Failed to update ticket" });
  }
}



async function dashboardStatsHandler(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = verifyToken(token);
    const stats = await ticketsService.getDashboardStatsForUser(decoded.id);

    res.json(stats);
  } catch (err) {
    console.error("dashboardStats error:", err);
    res.status(500).json({ message: "Failed to get dashboard stats" });
  }
}


async function assignTicketHandler(req, res) {
  try {
    const ticketId = req.params.id;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ message: "AgentId is required" });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { assignedTo: agentId },
      { new: true }
    ).populate("assignedTo", "name");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.json({
      success: true,
      message: "Ticket assigned successfully",
      ticket,
    });
  } catch (err) {
    console.error("Assign ticket error:", err);
    res.status(500).json({ message: "Failed to assign" });
  }
}

module.exports = {
  createTicketHandler,
  listTicketsHandler,
  updateTicketHandler,
  dashboardStatsHandler,
  assignTicketHandler,
};
