const express = require("express");
const router = express.Router();
const requireAdmin = require("../utils/requireAdmin");

const { adminStatsHandler } = require("../controllers/admin");
const { listTicketsHandler } = require("../controllers/tickets");
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

module.exports = router;
