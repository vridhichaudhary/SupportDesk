const express = require("express");
const router = express.Router();
const {
  createTicketHandler,
  listTicketsHandler,
  updateTicketHandler,
  dashboardStatsHandler,
} = require("../controllers/tickets");

router.post("/", createTicketHandler);

router.get("/", listTicketsHandler);

router.get("/stats", dashboardStatsHandler);

router.put("/:id", updateTicketHandler);

module.exports = router;
