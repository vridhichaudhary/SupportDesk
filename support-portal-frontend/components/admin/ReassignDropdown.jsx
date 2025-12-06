"use client";

import { useState, useEffect } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function ReassignDropdown({ ticket, onAssigned }) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchAgents() {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/admin/agents");
      setAgents(Array.isArray(res.data) ? res.data : []);

    } catch (err) {
      console.error("Failed to load agents:", err);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }

  async function assignTo(agentId) {
    try {
      await axiosInstance.put(`/admin/tickets/${ticket._id}`, {
        assignedTo: agentId,
      });

      alert("Ticket assigned!");
      setOpen(false);
      onAssigned(); 
    } catch (err) {
      console.error("Failed to assign:", err);
      alert("Failed to assign");
    }
  }

  const toggleDropdown = () => {
    setOpen(!open);
    if (!open) fetchAgents();
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={toggleDropdown}
        className="px-4 py-2 border rounded-lg bg-white shadow-sm hover:bg-gray-50"
      >
        Assign
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg border rounded-lg p-3 z-20">
          <p className="text-sm font-medium text-gray-700 mb-2">Assign to Agent</p>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : agents.length === 0 ? (
            <p className="text-gray-500 text-sm">No agents found</p>
          ) : (
            <ul className="space-y-2">
              {agents.map((agent) => (
                <li
                  key={agent._id}
                  onClick={() => assignTo(agent._id)}
                  className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-800"
                >
                  {agent.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
