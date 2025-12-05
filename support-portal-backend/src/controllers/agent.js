const Agent = require("../models/Agent");
const Ticket = require("../models/Ticket");

async function listAgents(req, res) {
  try {
    const agents = await Agent.find().lean();

    for (let agent of agents) {
      agent.ticketsAssigned = await Ticket.countDocuments({ assignedTo: agent._id });
    }

    res.json({ success: true, agents });
  } catch (err) {
    console.error("List agents error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch agents" });
  }
}

module.exports = { listAgents };
