const mongoose = require("../configuration/dbConfig");

const agentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: "Support Agent" }, 
  email: { type: String },
  ticketsAssigned: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Agent", agentSchema);
