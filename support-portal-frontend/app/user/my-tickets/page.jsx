"use client";
import { useEffect, useState, useRef } from "react";
import axiosInstance from "@/utils/axiosInstance";
import CreateTicketModal from "@/components/CreateTicketModal";
import TicketList from "@/components/TicketList";

export default function MyTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [ticketsData, setTicketsData] = useState({ items: [], total: 0, page: 1, limit: 10 });
  const [query, setQuery] = useState({ q: "", status: "", priority: "", category: "", sort: "-createdAt", page: 1 });
  const [openModal, setOpenModal] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchTickets();
  }, [query]);

  useEffect(() => {
    setSearchVal(query.q || "");
  }, []);

  function onFilterChange(part) {
    setQuery(q => ({ ...q, ...part, page: 1 }));
  }

  function onPage(p) {
    setQuery(q => ({ ...q, page: p }));
  }

  function handleSearchChange(v) {
    setSearchVal(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(q => ({ ...q, q: v, page: 1 }));
    }, 400);
  }

  async function fetchTickets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("mine", "true");
      if (query.q) params.append("q", query.q);
      if (query.status) params.append("status", query.status);
      if (query.priority) params.append("priority", query.priority);
      if (query.category) params.append("category", query.category);
      if (query.sort) params.append("sort", query.sort);
      if (query.page) params.append("page", query.page);
      params.append("limit", query.limit || 10);

      const res = await axiosInstance.get("/tickets?" + params.toString());
      setTicketsData(res.data);
    } catch (err) {
      console.error("fetch tickets error", err);
    } finally {
      setLoading(false);
    }
  }

  function onTicketCreated(newTicket) {
    fetchTickets();
  }

  return (
    <div className="flex">
      <aside className="w-64 bg-white border-r min-h-screen p-6">
      </aside>

      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Tickets</h1>
            <p className="text-gray-600">Manage your support requests</p>
          </div>
          <button onClick={()=>setOpenModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Create Ticket</button>
        </div>

        <div className="flex gap-3 items-center mb-6">
          <input value={searchVal} onChange={e=>handleSearchChange(e.target.value)}
            placeholder="Search tickets..." className="flex-1 border rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-400" />

          <div className="flex gap-2">
            <select value={query.status} onChange={e=>onFilterChange({ status: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <select value={query.sort} onChange={e=>onFilterChange({ sort: e.target.value })} className="border rounded px-3 py-2">
              <option value="-createdAt">Newest first</option>
              <option value="createdAt">Oldest first</option>
              <option value="-priority">Priority: High to Low</option>
              <option value="priority">Priority: Low to High</option>
            </select>
          </div>
        </div>

        <TicketList loading={loading} data={ticketsData} onPage={onPage} />

        <CreateTicketModal open={openModal} onClose={()=>setOpenModal(false)} onCreated={onTicketCreated} />
      </main>
    </div>
  );
}
