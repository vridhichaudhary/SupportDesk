const express = require("express");
const router = express.Router();
const requireAdmin = require("../utils/requireAdmin");

const { adminStatsHandler } = require("../controllers/admin");
const { listTicketsHandler } = require("../controllers/tickets");
const { listAgents } = require("../controllers/agent");

router.get("/dashboard", requireAdmin, adminStatsHandler);

router.get("/tickets", requireAdmin, listTicketsHandler);

router.get("/agents", requireAdmin, listAgents);

module.exports = router;
