"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function ReassignDropdown({ ticket, onAssigned }) {
  const [agents, setAgents] = useState([]);
  const [open, setOpen] = useState(false);

  async function loadAgents() {
    try {
      const res = await axiosInstance.get("/admin/agents");
      setAgents(res.data);
    } catch (err) {
      console.error("Failed to load agents", err);
    }
  }

  const handleAssign = async (agentId) => {
    try {
      await axiosInstance.post("/admin/agents/assign", {
        ticketId: ticket._id,
        agentId,
      });

      setOpen(false);
      onAssigned(); // refresh ticket list
    } catch (err) {
      alert("Failed to assign");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          loadAgents();
          setOpen(!open);
        }}
        className="px-3 py-2 bg-gray-800 text-white rounded-lg flex items-center gap-2"
      >
        👤 Reassign
      </button>

      {open && (
        <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-xl w-56 z-40 border">
          <div className="p-2 font-medium text-gray-600 border-b">
            Assign to Agent
          </div>

          {agents.map((agent) => (
            <button
              key={agent._id}
              onClick={() => handleAssign(agent._id)}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center gap-3"
            >
              <div className="bg-gray-300 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                {agent.name.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div className="font-medium">{agent.name}</div>
                <div className="text-xs text-gray-500">{agent.role}</div>
              </div>

              <div className="ml-auto text-xs text-gray-600">
                {agent.ticketsAssigned} tickets
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
