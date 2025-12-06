const express = require("express");
const router = express.Router();
const requireAdmin = require("../utils/requireAdmin");

const { adminStatsHandler } = require("../controllers/admin");
const { listTicketsHandler } = require("../controllers/tickets");
const { listAgents, assignTicket } = require("../controllers/agent");
const Agent = require("../models/Agent");
const Ticket = require("../models/Ticket");

router.get("/dashboard", requireAdmin, adminStatsHandler);

router.get("/tickets", requireAdmin, listTicketsHandler);

router.get("/agents", requireAdmin, async (req, res) => {
  try {
    const agents = await Agent.find().lean();

    const updatedAgents = await Promise.all(
      agents.map(async (agent) => {
        const count = await Ticket.countDocuments({ assignedTo: agent._id });
        return { ...agent, ticketsAssigned: count };
      })
    );

    res.json(updatedAgents);
  } catch (err) {
    console.error("Admin agents fetch error:", err);
    res.status(500).json([]);
  }
});

router.put("/tickets/:id", requireAdmin, assignTicket);

// NEW: Get single ticket by ID (for Ticket Details page)
router.get("/tickets/:id", requireAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("user", "name email")
      .populate("assignedTo", "name role ticketsAssigned")
      .lean();

    if (!ticket)
      return res.status(404).json({ success: false, message: "Ticket not found" });

    // load comments
    const Comment = require("../models/Comment");
    const comments = await Comment.find({ ticket: ticket._id })
      .populate("user", "name")
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, ticket, comments });
  } catch (err) {
    console.error("Admin fetch ticket by ID error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch ticket" });
  }
});

// NEW: Add a comment to ticket
router.post("/tickets/:id/comments", requireAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const Comment = require("../models/Comment");

    const comment = await Comment.create({
      ticket: req.params.id,
      user: req.user.id,  // from requireAdmin → req.user
      message: message.trim(),
    });

    const populated = await Comment.findById(comment._id)
      .populate("user", "name")
      .lean();

    res.status(201).json({ success: true, comment: populated });
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ success: false, message: "Failed to add comment" });
  }
});

module.exports = router;
