"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function ReassignModal({ open, ticket, onClose, onSuccess }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!open || !ticket) return null;

  async function fetchAgents() {
    try {
      const res = await axiosInstance.get("/admin/agents");
      setAgents(res.data);
    } catch (err) {
      console.error("Error loading agents:", err);
    }
  }

  async function handleAssign(agentId) {
    try {
      setLoading(true);

      await axiosInstance.post("/admin/agents/assign", {
        ticketId: ticket._id,
        agentId,
      });

      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error("Assign error:", err);
      alert("Failed to assign");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAgents();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-start pt-20 z-50">
      <div className="bg-white w-[380px] rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Reassign Ticket</h2>
        <p className="text-gray-600 mb-4">
          Ticket: <span className="font-semibold">{ticket.ticketId}</span>
        </p>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {agents.map((a) => (
            <div
              key={a._id}
              className="border rounded-lg p-3 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
              onClick={() => handleAssign(a._id)}
            >
              <div>
                <div className="font-semibold">{a.name}</div>
                <div className="text-gray-500 text-sm">{a.role}</div>
              </div>
              <div className="text-sm text-gray-600">
                {a.ticketsAssigned} tickets
              </div>
            </div>
          ))}
        </div>

        <button
          className="mt-5 w-full py-2 border rounded-lg"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
