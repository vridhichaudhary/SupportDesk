"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import CreateTicketModal from "@/components/CreateTicketModal";

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // CREATE TICKET MODAL
  const [openModal, setOpenModal] = useState(false);

  const fetchTickets = async () => {
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

      setTickets(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("failed loading tickets", err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, sort, status, priority, category, page]);

  const badgeColors = {
    open: "bg-blue-100 text-blue-700",
    "in-progress": "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-200 text-gray-600",

    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-6 bg-white min-h-screen">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>

        <button
          onClick={() => setOpenModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700"
        >
          + Create Ticket
        </button>
      </div>

      <p className="text-gray-500 mb-4">Manage your support requests</p>

      {/* SEARCH + FILTERS */}
      <div className="flex gap-3 items-center mb-6">

        <div className="relative w-80">
          <svg
            className="w-5 h-5 absolute left-3 top-2.5 text-gray-400"
            fill="none"
            strokeWidth="2"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="16.65" y1="16.65" x2="21" y2="21" />
          </svg>

          <input
            type="text"
            placeholder="Search tickets..."
            className="w-full border rounded-md pl-10 pr-3 py-2 bg-white"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2 border rounded-md bg-white hover:bg-gray-50"
          onClick={() => setIsFilterOpen(true)}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            strokeWidth="2"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M3 4h18l-7 9v6l-4 2v-8z" />
          </svg>
          Filters
        </button>

        <select
          className="px-3 py-2 border rounded-md bg-white"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="priority-high">Priority High → Low</option>
          <option value="priority-low">Priority Low → High</option>
        </select>
      </div>

      {/* TICKET LIST */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <div key={ticket._id} className="border rounded-lg p-5 bg-white shadow-sm">

            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-900">{ticket.ticketId}</span>

              <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeColors[ticket.status]}`}>
                {ticket.status}
              </span>

              <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeColors[ticket.priority]}`}>
                {ticket.priority}
              </span>
            </div>

            <h2 className="text-lg font-semibold text-gray-800">{ticket.title}</h2>
            <p className="text-gray-500 text-sm mt-1">
              Category: {ticket.category} • Created: {new Date(ticket.createdAt).toLocaleDateString()}
            </p>

          </div>
        ))}

        {tickets.length === 0 && <p className="text-gray-500">No tickets found</p>}
      </div>

      {/* PAGINATION */}
      <div className="flex justify-center gap-3 mt-6">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-4 py-2 border rounded-md bg-white disabled:opacity-40"
        >
          Prev
        </button>

        <div className="px-4 py-2 font-medium">
          Page {page} of {totalPages}
        </div>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 border rounded-md bg-white disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {/* CREATE TICKET MODAL */}
      <CreateTicketModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={() => {
          setOpenModal(false);
          fetchTickets();
        }}
      />

    </div>
  );
}
