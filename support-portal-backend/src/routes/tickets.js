const express = require("express");
const router = express.Router();

const {
  createTicketHandler,
  listTicketsHandler,
  updateTicketHandler
} = require("../controllers/tickets");

const { authenticateToken } = require("../utils/authMiddleware");

router.post("/", authenticateToken, createTicketHandler);

router.get("/", authenticateToken, listTicketsHandler);

router.put("/:id", authenticateToken, updateTicketHandler);

module.exports = router;
