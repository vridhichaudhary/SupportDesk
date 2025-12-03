const express = require("express");
const router = express.Router();
const { getAgents } = require("../controllers/agent");
const { assignAgent } = require("../controllers/adminTickets");

router.get("/", getAgents);

router.post("/assign", assignAgent);

module.exports = router;
