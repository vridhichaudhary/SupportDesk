const mongoose = require("../configuration/dbConfig");

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, enum: ["Technical", "Billing", "General"], default: "General" },
  priority: { type: String, enum: ["low", "medium", "high"], lowercase: true, default: "low" },
  status: { type: String, enum: ["open", "in-progress", "resolved", "closed"], default: "open" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Agent", default: null },

  createdAt: { type: Date, default: Date.now }
});

ticketSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Ticket", ticketSchema);
