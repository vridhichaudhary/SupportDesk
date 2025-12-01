"use client";
import { useEffect, useState, useCallback } from "react";
import axiosInstance from "@/utils/axiosInstance";
import CreateTicketModal from "@/components/CreateTicketModal";
import TicketList from "@/components/TicketList";

export default function MyTicketsPage() {
  const [query, setQuery] = useState({
    q: "",
    status: "all",
    priority: "all",
    category: "all",
    sort: "newest",
    page: 1,
    limit: 10,
  });

  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token") || "";
      const params = new URLSearchParams({
        ...query,
        mine: "true",
        page: query.page,
      });

      const res = await axiosInstance.get(`/tickets?${params.toString()}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      setData(res.data);
    } catch (err) {
      console.error("fetch tickets error", err);
      setError("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  function onFilterChange(updates) {
    setQuery((q) => ({ ...q, ...updates, page: 1 }));
  }

  function onPage(p) {
    setQuery((q) => ({ ...q, page: p }));
  }

  function handleCreated(newTicket) {
    // simplest approach: refresh list (will include new ticket)
    setQuery((q) => ({ ...q })); // trigger fetch via same query
    fetchTickets();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Tickets</h1>
          <p className="text-gray-500">Manage your support requests</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            placeholder="Search tickets..."
            value={query.q}
            onChange={(e)=>onFilterChange({ q: e.target.value })}
            className="px-4 py-2 border rounded w-96"
          />

          {/* Filters: simple select controls */}
          <select value={query.status} onChange={(e)=>onFilterChange({ status: e.target.value })} className="px-3 py-2 border rounded">
            <option value="all">All status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <select value={query.priority} onChange={(e)=>onFilterChange({ priority: e.target.value })} className="px-3 py-2 border rounded">
            <option value="all">All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select value={query.sort} onChange={(e)=>onFilterChange({ sort: e.target.value })} className="px-3 py-2 border rounded">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority-high">Priority: High to Low</option>
            <option value="priority-low">Priority: Low to High</option>
          </select>

          <button onClick={()=>setShowCreate(true)} className="px-4 py-2 bg-green-600 text-white rounded">+ Create Ticket</button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      <TicketList data={data} loading={loading} onFilterChange={onFilterChange} onPage={onPage} query={query} />

      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={(t) => handleCreated(t)}
        />
      )}
    </div>
  );
}
