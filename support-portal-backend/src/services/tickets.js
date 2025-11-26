const Ticket = require("../models/Ticket");

async function createTicket(data) {
  const t = new Ticket(data);
  return await t.save();
}

async function getTickets(filter = {}) {
  return await Ticket.find(filter).sort({ createdAt: -1 }).lean();
}

module.exports = { createTicket, getTickets };
