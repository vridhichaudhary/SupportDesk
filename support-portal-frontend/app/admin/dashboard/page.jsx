// app/admin/dashboard/page.jsx
"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import StatCard from "@/components/StatCard";
import RecentTicketItem from "@/components/RecentTicketItem";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/tickets", {
        params: { limit: 1000, page: 1 }
      });
      const items = res.data.items || [];
      setTickets(items);
    } catch (err) {
      console.error("Failed to load tickets", err);
    } finally {
      setLoading(false);
    }
  }

  // compute counts
  const total = tickets.length;
  const open = tickets.filter(t => t.status === "open").length;
  const inProgress = tickets.filter(t => t.status === "in-progress").length;
  const resolved = tickets.filter(t => t.status === "resolved").length;

  // most recent 3
  const recentSorted = [...tickets].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,3);

  function handleLogout() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
    router.push("/login");
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor support operations and team performance</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-md bg-gray-100 border text-gray-700 hover:bg-gray-200"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Tickets" value={total} note="+12% from last month" />
        <StatCard title="Open Tickets" value={open} note="+5% from last month" />
        <StatCard title="Resolved" value={resolved} note="+8% from last month" />
        <StatCard title="In Progress" value={inProgress} note="-15% from last month" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-2xl font-bold mb-2">Recent Tickets</h2>
          <p className="text-gray-500 mb-4">Latest support requests requiring attention</p>

          <div className="space-y-4">
            {loading && <div className="text-gray-500">Loading...</div>}
            {!loading && recentSorted.length === 0 && <div className="text-gray-500">No recent tickets</div>}
            {!loading && recentSorted.map(t => <RecentTicketItem key={t._id} ticket={t} />)}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-2xl font-bold mb-2">Quick Actions</h2>
          <p className="text-gray-500 mb-4">Common admin tasks</p>

          <div className="space-y-3">
            <button onClick={()=>router.push("/admin/tickets")} className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50">
              View all tickets
            </button>
            <button onClick={()=>router.push("/admin/agents")} className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50">
              Manage agents
            </button>
            <button onClick={()=>router.push("/admin/settings")} className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50">
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
