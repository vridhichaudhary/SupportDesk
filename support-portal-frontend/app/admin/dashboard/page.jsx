"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  });

  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    try {
      const res = await axiosInstance.get("/admin/dashboard");
      setStats(res.data.stats);
      setRecent(res.data.recent);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  const badge = {
    open: "bg-blue-100 text-blue-700",
    "in-progress": "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-200 text-gray-600",

    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700"
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <h1 className="text-4xl font-bold mb-1">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">Monitor support operations and ticket flow</p>

      {/* STATS CARDS */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500">Total Tickets</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500">Open Tickets</div>
          <div className="text-3xl font-bold text-gray-900">{stats.open}</div>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500">Resolved</div>
          <div className="text-3xl font-bold text-gray-900">{stats.resolved}</div>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500">In Progress</div>
          <div className="text-3xl font-bold text-gray-900">{stats.inProgress}</div>
        </div>
      </div>

      {/* RECENT TICKETS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold mb-2">Recent Tickets</h2>
        <p className="text-gray-500 mb-4">Latest support requests requiring attention</p>

        <div className="space-y-4">
          {recent.map((t) => (
            <div key={t._id} className="border rounded-lg p-5 bg-white shadow-sm">
              <div className="flex justify-between">
                <div>
                  <div className="flex gap-2 mb-1">
                    <span className="font-semibold">{t.ticketId}</span>
                    <span className={`px-3 py-1 rounded-full text-xs ${badge[t.status]}`}>
                      {t.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs ${badge[t.priority.toLowerCase()]}`}>
                      {t.priority}
                    </span>
                  </div>

                  <h4 className="text-lg font-semibold">{t.title}</h4>

                  <p className="text-sm text-gray-500 mt-1">
                    Category: {t.category} • Created: {new Date(t.createdAt).toLocaleDateString()}
                  </p>

                  <p className="text-sm text-gray-600">
                    Assigned to:{" "}
                    <span className="font-medium">{t.assignedTo ? t.assignedTo.name : "Admin"}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}

          {recent.length === 0 && (
            <div className="text-gray-500">No recent tickets found</div>
          )}
        </div>
      </div>
    </div>
  );
}
