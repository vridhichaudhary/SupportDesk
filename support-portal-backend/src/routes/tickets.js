const express = require("express");
const router = express.Router();
const { createTicketHandler, listTicketsHandler } = require("../controllers/tickets");
const { authenticateToken } = require("../utils/authMiddleware");

// Create ticket (auth required)
router.post("/", authenticateToken, createTicketHandler);

// List tickets
router.get("/", authenticateToken, listTicketsHandler);

module.exports = router;
