const Ticket = require("../models/Ticket");
const Agent = require("../models/Agent");

async function assignAgent(req, res) {
  try {
    const { ticketId, agentId } = req.body;

    if (!ticketId || !agentId)
      return res.status(400).json({ success: false, message: "ticketId and agentId required" });

    const agent = await Agent.findById(agentId);
    if (!agent) return res.status(404).json({ success: false, message: "Agent not found" });

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { assignedTo: agentId },
      { new: true }
    ).populate("assignedTo", "name");

    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    agent.ticketsAssigned = await Ticket.countDocuments({ assignedTo: agentId });
    await agent.save();

    return res.json({
      success: true,
      message: "Ticket assigned",
      ticket,
    });

  } catch (err) {
    console.error("assignAgent error:", err);
    res.status(500).json({ success: false, message: "Failed to assign" });
  }
}

module.exports = { assignAgent };
