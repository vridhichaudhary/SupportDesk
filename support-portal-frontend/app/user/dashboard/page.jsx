"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import CreateTicketModal from "@/components/CreateTicketModal";   
import UserLayoutClient from "../layoutClient";

export default function UserDashboard() {
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/tickets?mine=true&limit=100&page=1");
      const items = res.data.items || [];

      const open = items.filter((t) => t.status === "open").length;
      const inProgress = items.filter((t) => t.status === "in-progress").length;
      const resolved = items.filter((t) => t.status === "resolved").length;

      const sorted = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecent(sorted.slice(0, 3));

      setStats({ open, inProgress, resolved });
    } catch (err) {
      console.error("dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  return (
    <UserLayoutClient>
      <div className="p-8 bg-gray-50 min-h-screen">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-gray-600">Welcome to your support portal</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              + New Ticket
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        <CreateTicketModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={fetchDashboard}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-6 rounded-lg border bg-blue-50">
            <div className="text-sm text-blue-700 font-medium">Open Tickets</div>
            <div className="text-3xl font-bold text-blue-900">{stats.open}</div>
          </div>

          <div className="p-6 rounded-lg border bg-yellow-50">
            <div className="text-sm text-yellow-700 font-medium">In Progress</div>
            <div className="text-3xl font-bold text-yellow-900">{stats.inProgress}</div>
          </div>

          <div className="p-6 rounded-lg border bg-green-50">
            <div className="text-sm text-green-700 font-medium">Resolved</div>
            <div className="text-3xl font-bold text-green-900">{stats.resolved}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-2xl font-bold mb-2">Recent Tickets</h2>
          <p className="text-gray-500 mb-4">Your latest support requests</p>

          <div className="space-y-4">
            {!loading && recent.length === 0 && (
              <div className="text-gray-500">No recent tickets</div>
            )}

            {recent.map((t) => (
              <div key={t._id} className="border rounded p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-700">{t.ticketId}</div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Category: {t.category} • Created:{" "}
                      {new Date(t.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`px-3 py-1 rounded-full text-xs ${
                        t.priority?.toLowerCase() === "high"
                          ? "bg-red-100 text-red-800"
                          : t.priority?.toLowerCase() === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {t.priority}
                    </div>

                    <div
                      className={`px-3 py-1 rounded-full text-xs ${
                        t.status === "in-progress"
                          ? "bg-yellow-100 text-yellow-800"
                          : t.status === "open"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {t.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </UserLayoutClient>
  );
}
