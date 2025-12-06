const Agent = require("../models/Agent");
const Ticket = require("../models/Ticket");

async function listAgents(req, res) {
  try {
    const agents = await Agent.find().lean();

    const updatedAgents = await Promise.all(
      agents.map(async (agent) => {
        const count = await Ticket.countDocuments({ assignedTo: agent._id });
        return { ...agent, ticketsAssigned: count };
      })
    );

    res.json({ success: true, agents: updatedAgents });
  } catch (err) {
    console.error("List agents error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch agents" });
  }
}


async function assignTicket(req, res) {
  try {
    const ticketId = req.params.id;
    const { assignedTo } = req.body;

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { assignedTo },
      { new: true }
    ).populate("assignedTo", "name");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (assignedTo) {
      const count = await Ticket.countDocuments({ assignedTo });
      await Agent.findByIdAndUpdate(assignedTo, { ticketsAssigned: count });
    }

    res.json({ success: true, ticket });

  } catch (err) {
    console.error("Assign ticket error:", err);
    res.status(500).json({ message: "Failed to assign ticket" });
  }
}

module.exports = { listAgents, assignTicket };
