"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function ReassignDropdown({ ticket, onAssigned }) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState([]);

  async function fetchAgents() {
    try {
      const res = await axiosInstance.get("/admin/agents");
      setAgents(res.data.agents || []);
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    }
  }

  const toggleDropdown = () => {
    setOpen(!open);

    if (!open) fetchAgents(); // fetch only when opening
  };

  async function handleAssign(agentId) {
    try {
      const res = await axiosInstance.put(`/admin/tickets/${ticket._id}/assign`, {
        agentId,
      });

      alert("Assigned successfully!");

      setOpen(false);
      onAssigned(); // refresh ticket list
    } catch (err) {
      console.error(err);
      alert("Failed to assign");
    }
  }

  return (
    <div className="relative">
      {/* Assign Button */}
      <button
        onClick={toggleDropdown}
        className="px-4 py-2 rounded-lg bg-white border shadow-sm hover:bg-gray-50 transition"
      >
        Assign
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white shadow-lg border rounded-xl z-10 p-3">
          <p className="text-gray-600 text-sm mb-2">Assign to Agent</p>

          {agents.length === 0 && (
            <p className="text-gray-400 text-sm">No agents found</p>
          )}

          <div className="space-y-2">
            {agents.map((agent) => (
              <button
                key={agent._id}
                onClick={() => handleAssign(agent._id)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition"
              >
                {agent.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
