"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAgents() {
    try {
      const res = await axiosInstance.get("/admin/agents");
      setAgents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed loading agents:", err);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgents();
  }, []);

  return (
    <div className="p-10 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold mb-2 text-gray-900">Support Agents</h1>
      <p className="text-gray-600 mb-10">List of agents and assigned ticket counts</p>

      {loading ? (
        <div className="text-gray-500">Loading agents...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {agents.length === 0 && (
            <div className="text-gray-500">No agents found</div>
          )}

          {agents.map((a) => (
            <div
              key={a._id}
              className="
                bg-white p-6 rounded-2xl border shadow-sm
                hover:shadow-md transition cursor-pointer
                flex justify-between items-center
              "
            >
              <div>
                <div className="text-xl font-semibold text-gray-900">
                  {a.name}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {a.role}
                </div>
              </div>

              <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-medium">
                {a.ticketsAssigned || 0} tickets
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
