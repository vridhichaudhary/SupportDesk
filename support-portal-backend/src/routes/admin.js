const express = require("express");
const router = express.Router();

const requireAdmin = require("../utils/requireAdmin");
const { adminStatsHandler } = require("../controllers/admin");
const { listTicketsHandler, updateTicketHandler } = require("../controllers/tickets");

router.get("/dashboard", requireAdmin, adminStatsHandler);

router.get("/tickets", requireAdmin, listTicketsHandler);
router.put("/tickets/:id", requireAdmin, updateTicketHandler);

module.exports = router;
