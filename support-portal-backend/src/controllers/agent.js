const Agent = require("../models/Agent");

async function listAgentsHandler(req, res) {
  try {
    const agents = await Agent.find().select("name");
    return res.json({ agents });
  } catch (err) {
    console.error("List agents error:", err);
    return res.status(500).json({ message: "Failed to load agents" });
  }
}

module.exports = { listAgentsHandler };
