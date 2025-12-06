const express = require("express");
const router = express.Router();
const {
  createTicketHandler,
  listTicketsHandler,
  updateTicketHandler,
  dashboardStatsHandler,
  getTicketByIdHandler,
  addCommentHandler
} = require("../controllers/tickets");

router.post("/", createTicketHandler);

router.get("/", listTicketsHandler);

router.get("/:id", getTicketByIdHandler);

router.post("/:id/comments", addCommentHandler);

router.get("/stats", dashboardStatsHandler);

router.put("/:id", updateTicketHandler);

module.exports = router;
