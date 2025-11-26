"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import TicketList from "@/components/TicketList";
import NewTicketModal from "@/components/NewTicketModal";

export default function DashboardPage() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, chats: 0 });
  const [loading, setLoading] = useState(true);

  async function fetchTickets() {
    try {
      const token = localStorage.getItem("token");
      const res = await axiosInstance.get("/api/tickets", {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      setTickets(res.data || []);
      // compute stats
      const open = (res.data || []).filter(t => t.status === "open").length;
      const inProgress = (res.data || []).filter(t => t.status === "in-progress").length;
      const resolved = (res.data || []).filter(t => t.status === "resolved").length;
      setStats({ open, inProgress, resolved, chats: 0 });
    } catch (err) {
      console.error("Fetch tickets error:", err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#070707] text-gray-200">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <div className="text-gray-400">Welcome to your support portal</div>
          </div>

          <div className="flex items-center gap-4">
            <NewTicketModal onCreated={() => fetchTickets()} />
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <StatCard title="Open Tickets" value={stats.open} />
          <StatCard title="In Progress" value={stats.inProgress} />
          <StatCard title="Resolved" value={stats.resolved} />
          <StatCard title="Chat Sessions" value={stats.chats} />
        </div>

        <section className="mt-6">
          <div className="bg-[#050505] border border-[#1f1f1f] rounded-lg p-6">
            <TicketList tickets={tickets} />
          </div>
        </section>
      </main>
    </div>
  );
}
