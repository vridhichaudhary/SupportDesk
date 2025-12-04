exports.assignAgent = async function (req, res) {
  try {
    const { ticketId, agentId } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const newAgent = await Agent.findById(agentId);
    if (!newAgent) return res.status(404).json({ message: "Agent not found" });

    if (ticket.assignedTo) {
      await Agent.findByIdAndUpdate(ticket.assignedTo, {
        $inc: { ticketsAssigned: -1 }
      });
    }

    ticket.assignedTo = agentId;
    await ticket.save();

    await Agent.findByIdAndUpdate(agentId, {
      $inc: { ticketsAssigned: 1 }
    });

    res.json({ success: true, message: "Agent assigned successfully" });
  } catch (err) {
    console.error("assignAgent error:", err);
    res.status(500).json({ message: "Assignment failed" });
  }
};
