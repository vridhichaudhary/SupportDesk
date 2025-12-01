"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import CreateTicketModal from "@/components/CreateTicketModal";

function StatusBadge({ status }) {
  const map = {
    open: "bg-blue-100 text-blue-800",
    "in-progress": "bg-yellow-100 text-yellow-800",
    resolved: "bg-green-100 text-green-800"
  };
  return <span className={`px-3 py-1 rounded-full text-xs ${map[status] || "bg-gray-100 text-gray-800"}`}>{status}</span>;
}

function PriorityBadge({ priority }) {
  const map = {
    Low: "bg-green-100 text-green-800",
    Medium: "bg-yellow-100 text-yellow-800",
    High: "bg-red-100 text-red-800"
  };
  return <span className={`px-3 py-1 rounded-full text-xs ${map[priority] || "bg-gray-100 text-gray-800"}`}>{priority}</span>;
}

export default function MyTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [error, setError] = useState("");

  async function loadTickets() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axiosInstance.get(`/tickets?mine=true`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      // your backend returns { items, total } or an array; handle both
      const data = res.data;
      setTickets(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error("fetch tickets error", err);
      if (err?.response?.status === 401) {
        setError("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setTimeout(() => (window.location.href = "/login"), 900);
      } else {
        setError("Failed to load tickets");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  function handleCreated(newTicket) {
    // prepend the new ticket to list so user sees it immediately
    setTickets(prev => [newTicket, ...prev]);
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Tickets</h1>
          <button onClick={() => setOpenModal(true)} className="bg-green-600 text-white px-4 py-2 rounded">+ Create Ticket</button>
        </div>

        {error && <div className="mb-4 text-red-700 bg-red-100 p-3 rounded">{error}</div>}

        {loading ? (
          <div>Loading...</div>
        ) : tickets.length === 0 ? (
          <div className="p-6 bg-white border rounded text-gray-500">No tickets found. Create your first ticket!</div>
        ) : (
          <div className="space-y-4">
            {tickets.map(t => (
              <div key={t._id || t.ticketId} className="bg-white p-6 rounded shadow border flex justify-between items-center">
                <div>
                  <div className="flex gap-3 items-center mb-1">
                    <div className="font-semibold text-sm">{t.ticketId}</div>
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <div className="text-lg font-semibold">{t.title}</div>
                  <div className="text-sm text-gray-500 mt-2">
                    Category: {t.category} &nbsp; • &nbsp; Created: {new Date(t.createdAt).toLocaleString()}
                  </div>
                </div>

                <div>
                  <button className="px-4 py-2 border rounded">View</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateTicketModal open={openModal} onClose={() => setOpenModal(false)} onCreated={handleCreated} />
    </div>
  );
}
