// app/(user)/dashboard/page.jsx
"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function UserDashboard() {
  const [stats, setStats] = useState({ open:0, inProgress:0, resolved:0, recent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats(){
      setLoading(true);
      try {
        const token = localStorage.getItem("token") || "";
        const res = await axiosInstance.get("/tickets/stats", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        setStats(res.data);
      } catch (err) {
        console.error("fetch stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 rounded-xl bg-[#0b0b0b] border">
            <div className="text-sm text-gray-400">Open Tickets</div>
            <div className="text-3xl font-bold text-white">{stats.open}</div>
          </div>
          <div className="p-6 rounded-xl bg-[#0b0b0b] border">
            <div className="text-sm text-gray-400">In Progress</div>
            <div className="text-3xl font-bold text-white">{stats.inProgress}</div>
          </div>
          <div className="p-6 rounded-xl bg-[#0b0b0b] border">
            <div className="text-sm text-gray-400">Resolved</div>
            <div className="text-3xl font-bold text-white">{stats.resolved}</div>
          </div>
          <div className="p-6 rounded-xl bg-[#0b0b0b] border">
            <div className="text-sm text-gray-400">Recent Tickets</div>
            <div className="mt-3 space-y-3">
              {loading && <div className="text-gray-400">Loading...</div>}
              {!loading && stats.recent && stats.recent.map(t => (
                <div key={t._id} className="p-3 bg-[#0b0b0b]">
                  <div className="text-sm text-gray-300">{t.ticketId}</div>
                  <div className="font-medium text-white">{t.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
