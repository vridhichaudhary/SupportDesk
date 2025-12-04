"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function ReassignDropdown({ ticket, onAssigned }) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState([]);

  async function fetchAgents() {
    try {
      const res = await axiosInstance.get("/agents");
      setAgents(res.data || []);
    } catch (err) {
      console.error("Failed to load agents", err);
    }
  }

  async function assign(agentId) {
    try {
      await axiosInstance.put(`/admin/tickets/${ticket._id}/assign`, {
        agentId,
      });

      alert("Assigned successfully!");
      onAssigned();
      setOpen(false);
    } catch (err) {
      alert("Failed to assign");
      console.error(err);
    }
  }

  useEffect(() => {
    fetchAgents();
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 border rounded-lg bg-white text-gray-800 hover:bg-gray-100 shadow-sm"
      >
        Assign
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-xl p-2 z-50">
          <p className="text-sm font-semibold text-gray-700 px-2 mb-2">
            Assign to Agent
          </p>

          {agents.map((a) => (
            <button
              key={a._id}
              onClick={() => assign(a._id)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 w-full text-left"
            >
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-700">
                {a.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .toUpperCase()}
              </div>

              <span className="font-medium text-gray-800">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
