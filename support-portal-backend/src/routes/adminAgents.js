const express = require("express");
const router = express.Router();

const { listAgents } = require("../controllers/agent");
const { assignAgent } = require("../controllers/adminTickets");

router.get("/", listAgents);
router.post("/assign", assignAgent);

module.exports = router;
