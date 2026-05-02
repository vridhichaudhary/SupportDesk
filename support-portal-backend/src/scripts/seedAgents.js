const Agent = require("../models/Agent");

async function seedAgents() {
  const agents = [
    { name: "Rahul Sharma", role: "Senior Support Agent" },
    { name: "Alice Brown", role: "Support Agent" },
    { name: "Atlas Johnson", role: "Technical Specialist" },
    { name: "Sarah Wilson", role: "Support Agent" }
  ];

  for (const a of agents) {
    const exists = await Agent.findOne({ name: a.name });
    if (!exists) await Agent.create(a);
  }

  console.log("Agents seeded successfully");
}

module.exports = seedAgents;
