"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await axiosInstance.get("/admin/dashboard");
      setStats(res.data.stats);
      setRecent(res.data.recent);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    }
  }

  if (!stats) return <div className="p-8">Loading...</div>;

  const total = stats.total;
  const open = stats.open;
  const resolved = stats.resolved;
  const inProgress = stats.inProgress;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">

      <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">Monitor support operations and ticket flow</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Tickets" value={total} />
        <StatCard label="Open Tickets" value={open} />
        <StatCard label="Resolved" value={resolved} />
        <StatCard label="In Progress" value={inProgress} />
      </div>

      <CategorySection categories={stats.categories} />

      <RecentTickets recent={recent} />

    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="p-6 bg-white rounded-lg border shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function CategorySection({ categories }) {
  if (!categories || categories.length === 0) return null;

  const total = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="bg-white rounded-lg border p-6 mb-8">
      <h2 className="text-2xl font-bold mb-1">Ticket Categories</h2>
      <p className="text-gray-500 mb-6">Distribution of support requests by category</p>

      <div className="grid grid-cols-3 gap-8">
        {categories.map(cat => {
          const percent = ((cat.count / total) * 100).toFixed(0);
          return (
            <div key={cat._id} className="text-center">
              <div className="text-4xl font-bold">{cat.count}</div>
              <div className="text-gray-600 mb-2">{cat._id}</div>

              <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
                <div
                  className="bg-green-400 h-3 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="text-sm text-gray-500">{percent}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentTickets({ recent }) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-2xl font-bold mb-1">Recent Tickets</h2>
      <p className="text-gray-500 mb-4">Latest support requests requiring attention</p>

      <div className="space-y-4">
        {recent.map(t => (
          <div key={t._id} className="border rounded-lg p-4 bg-gray-50">
            <div className="font-semibold">{t.ticketId}</div>

            <div className="font-medium">{t.title}</div>

            <div className="text-sm text-gray-500">
              Category: {t.category} • Created: {new Date(t.createdAt).toLocaleDateString()}
            </div>

            <div className="text-sm text-gray-500">
              Assigned to: {t.assignedTo?.name || "Unassigned"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
