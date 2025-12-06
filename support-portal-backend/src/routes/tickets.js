const express = require("express");
const router = express.Router();

const {
  createTicketHandler,
  listTicketsHandler,
  updateTicketHandler,
  dashboardStatsHandler,
  deleteTicketHandler,      
} = require("../controllers/tickets");

const authMiddleware = require("../utils/authMiddleware"); 

router.post("/", createTicketHandler);

router.get("/", listTicketsHandler);

router.get("/stats", dashboardStatsHandler);

router.put("/:id", updateTicketHandler);

router.delete(
  "/:id",
  authMiddleware.authenticateToken, 
  deleteTicketHandler
);

module.exports = router;
