const Agent = require("../models/Agent");

exports.getAgents = async function (req, res) {
  try {
    const agents = await Agent.find().sort({ ticketsAssigned: -1 });
    res.json(agents);
  } catch (err) {
    console.error("getAgents error:", err);
    res.status(500).json({ message: "Failed to fetch agents" });
  }
};
