const Agent = require("../models/Agent");

async function seedAgents() {
  const agents = [
    { name: "John Doe", role: "Senior Support Agent" },
    { name: "Jane Smith", role: "Support Agent" },
    { name: "Mike Johnson", role: "Technical Specialist" },
    { name: "Sarah Wilson", role: "Support Agent" }
  ];

  for (const a of agents) {
    const exists = await Agent.findOne({ name: a.name });
    if (!exists) await Agent.create(a);
  }

  console.log("Agents seeded successfully");
}

module.exports = seedAgents;
