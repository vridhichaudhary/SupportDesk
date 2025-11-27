"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import CreateTicketModal from "@/components/CreateTicketModal";
import TicketList from "@/components/TicketList";

export default function MyTicketsPage(){
  const [loading, setLoading] = useState(true);
  const [ticketsData, setTicketsData] = useState({ items: [], total: 0 });
  const [query, setQuery] = useState({ q: "", status: "", priority: "", category: "", sort: "-createdAt", page: 1, limit: 10 });
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let didCancel = false;
    async function fetchTickets(){
      setLoading(true);
      try {
        const params = new URLSearchParams({
          ...query,
          mine: "true" 
        });
        const res = await axiosInstance.get(`/tickets?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }
        });
        if (!didCancel) setTicketsData(res.data);
      } catch (err) {
        console.error("fetchTickets error", err);
      } finally {
        if (!didCancel) setLoading(false);
      }
    }
    fetchTickets();
    return ()=> { didCancel = true; }
  }, [query, refreshKey]);

  function handleSearch(q) {
    setQuery(prev => ({ ...prev, q, page: 1 }));
  }
  function handleFilter(partial) {
    setQuery(prev => ({ ...prev, ...partial, page: 1 }));
  }
  function onTicketCreated() {
    setShowModal(false);
    setRefreshKey(k => k + 1); // refresh list
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <button onClick={()=>setShowModal(true)} className="bg-green-600 text-white px-4 py-2 rounded">+ Create Ticket</button>
      </div>

      <div className="mb-4">
        <input placeholder="Search tickets..." className="w-full p-3 border rounded" onChange={(e)=>handleSearch(e.target.value)} />
      </div>

      <TicketList
        loading={loading}
        data={ticketsData}
        onFilterChange={handleFilter}
        onPage={(p)=> setQuery(prev => ({ ...prev, page: p }))}
        query={query}
      />

      {showModal && <CreateTicketModal onClose={()=>setShowModal(false)} onCreated={onTicketCreated} />}
    </div>
  );
}
