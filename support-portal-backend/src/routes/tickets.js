const express = require("express");
const router = express.Router();
const { createTicketHandler, listTicketsHandler } = require("../controllers/tickets");

router.post("/", createTicketHandler);

router.get("/", listTicketsHandler);

module.exports = router;
