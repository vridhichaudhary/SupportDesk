const mongoose = require("../configuration/dbConfig");

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true }, 
  title: { type: String, required: true },
  description: { type: String, default: "" },
  category: { type: String, enum: ["Technical", "Billing", "General"], default: "General" },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Low" },
  status: { type: String, enum: ["open", "in-progress", "resolved", "closed"], default: "open" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

ticketSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Ticket", ticketSchema);
