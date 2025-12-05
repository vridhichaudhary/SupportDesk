const express = require("express");
const router = express.Router();

const requireAdmin = require("../utils/requireAdmin");
const { adminStatsHandler } = require("../controllers/admin");
const { listTicketsHandler, updateTicketHandler, assignTicketHandler } = require("../controllers/tickets");
const { listAgentsHandler } = require("../controllers/agent");

router.get("/dashboard", requireAdmin, adminStatsHandler);

router.get("/tickets", requireAdmin, listTicketsHandler);

router.get("/agents", requireAdmin, async (req, res) => {
    const agents = await Agent.find().lean();
    res.json({ agents });
  });

router.put("/tickets/:id", requireAdmin, updateTicketHandler);

router.put("/tickets/:id/assign", requireAdmin, assignTicketHandler);

router.get("/agents", requireAdmin, listAgentsHandler);

module.exports = router;
