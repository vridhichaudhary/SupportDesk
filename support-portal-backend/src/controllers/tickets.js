const ticketsService = require("../services/tickets");
const { verifyToken } = require("../utils/authMiddleware");
const Ticket = require("../models/Ticket");
const Agent = require("../models/Agent");
const Comment = require("../models/Comment");

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
    const { assignedTo } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { assignedTo },
      { new: true }
    ).populate("assignedTo", "name");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (assignedTo) {
      const count = await Ticket.countDocuments({ assignedTo });
      await Agent.findByIdAndUpdate(assignedTo, { ticketsAssigned: count });
    }

    res.json({ ticket });
  } catch (err) {
    console.error("Update ticket error:", err);
    res.status(500).json({ message: "Failed to update ticket" });
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

async function getTicketByIdHandler(req, res) {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id)
      .populate("user", "name email")
      .populate("assignedTo", "name role ticketsAssigned")
      .lean();

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const comments = await Comment.find({ ticket: id })
      .populate("user", "name")
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ ticket, comments });
  } catch (err) {
    console.error("getTicketById error:", err);
    return res.status(500).json({ message: "Failed to fetch ticket" });
  }
}

async function addCommentHandler(req, res) {
  try {
    const { id } = req.params; 
    const { message } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    let userId = req.body.userId || null;
    if (!userId && token) {
      try {
        const decoded = verifyToken(token);
        userId = decoded.id;
      } catch (e) { /* ignore */ }
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }
    if (!userId) return res.status(401).json({ message: "User not authenticated" });

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const comment = await Comment.create({
      ticket: id,
      user: userId,
      message: message.trim()
    });

    const populated = await Comment.findById(comment._id).populate("user", "name").lean();

    return res.status(201).json({ comment: populated });
  } catch (err) {
    console.error("addComment error:", err);
    return res.status(500).json({ message: "Failed to add comment" });
  }
}

module.exports = {
  createTicketHandler,
  listTicketsHandler,
  updateTicketHandler,
  dashboardStatsHandler,
  assignTicketHandler,
  getTicketByIdHandler,
  addCommentHandler
};
