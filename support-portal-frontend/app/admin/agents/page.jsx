"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAgents() {
    try {
      const res = await axiosInstance.get("/admin/agents");
      setAgents(res.data || []);
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
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-2">Support Agents</h1>
      <p className="text-gray-600 mb-6">List of agents and assigned ticket counts</p>

      {loading ? (
        <div>Loading agents...</div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {agents.length === 0 && <div className="text-gray-500">No agents found</div>}
          {agents.map((a) => (
            <div key={a._id} className="bg-white p-4 rounded-lg border flex justify-between items-center">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-sm text-gray-500">{a.role}</div>
              </div>
              <div className="text-sm text-gray-600">{a.ticketsAssigned || 0} tickets</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
