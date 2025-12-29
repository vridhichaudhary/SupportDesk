"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import CreateTicketModal from "@/components/CreateTicketModal";
import TicketList from "@/components/TicketList";
import TicketDetailModal from "@/components/TicketDetailModal";
import UserLayoutClient from "../layoutClient";
import { Plus, Search, Filter, ChevronDown } from "lucide-react";

export default function MyTicketsPage() {
  const [ticketsData, setTicketsData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {
        mine: true,
        page,
        limit: 10,
        sort,
      };

      if (search.trim()) params.q = search;
      if (status !== "all") params.status = status;
      if (priority !== "all") params.priority = priority;
      if (category !== "all") params.category = category;

      const res = await axiosInstance.get("/tickets", { params });
      setTicketsData({
        items: res.data.items || [],
        total: res.data.totalCount || 0,
        page: res.data.page,
        limit: res.data.limit
      });
    } catch (err) {
      console.error("failed loading tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, sort, status, priority, category, page]);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await axiosInstance.delete(`/tickets/${id}`);
      fetchTickets();
    } catch (err) {
      alert("Failed to delete ticket");
    }
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  };

  return (
    <UserLayoutClient>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-2">My Support Requests</h1>
          </div>

          <button
            onClick={() => setOpenCreateModal(true)}
            className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-stone-800 transition-all shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Initialize Request
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-accent-600 transition-colors" />
            <input
              type="text"
              placeholder="Search by ID or Subject..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-600/10 focus:border-accent-600 transition-all shadow-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <select
                className="appearance-none w-full sm:w-44 pl-10 pr-10 py-3 bg-white border border-stone-200 rounded-2xl text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-accent-600/10 transition-all cursor-pointer shadow-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In-Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
            </div>

            <div className="relative flex-1 sm:flex-none">
              <select
                className="appearance-none w-full sm:w-44 pl-4 pr-10 py-3 bg-white border border-stone-200 rounded-2xl text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-accent-600/10 transition-all cursor-pointer shadow-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority-high">High Priority</option>
                <option value="priority-low">Low Priority</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <TicketList
          loading={loading}
          data={ticketsData}
          onPage={setPage}
          onTicketClick={handleTicketClick}
          onDelete={handleDelete}
        />

        <CreateTicketModal
          open={openCreateModal}
          onClose={() => setOpenCreateModal(false)}
          onCreated={() => {
            setOpenCreateModal(false);
            fetchTickets();
          }}
        />

        <TicketDetailModal
          isOpen={isDetailModalOpen}
          ticket={selectedTicket}
          onClose={() => setIsDetailModalOpen(false)}
        />
      </div>
    </UserLayoutClient>
  );
}
