"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import CreateTicketModal from "@/components/CreateTicketModal";
import UserLayoutClient from "../layoutClient";

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dropdown, setDropdown] = useState({
    status: false,
    priority: false,
    category: false,
  });

  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [openModal, setOpenModal] = useState(false);

  const toggleDropdown = (key) => {
    setDropdown({
      status: false,
      priority: false,
      category: false,
      [key]: !dropdown[key],
    });
  };

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

  const handleDelete = async (id) => {
  if (!confirm("Delete this ticket?")) return;
  await axiosInstance.delete(`/tickets/${id}`);
  fetchTickets();
  };

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
    <UserLayoutClient>
    <div className="p-4 md:p-6 bg-white min-h-screen">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">

        <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>

        <button
          onClick={() => setOpenModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700"
        >
          + Create Ticket
        </button>
      </div>

      <p className="text-gray-500 mb-4">Manage your support requests</p>

     <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center mb-6">

        <div className="relative w-full sm:w-80">

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
          <svg className="w-5 h-5" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M3 4h18l-7 9v6l-4 2v-8z"></path>
          </svg>
          Filters
        </button>

        <select
          className="px-3 py-2 border rounded-md bg-white"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="priority-high">Priority High → Low</option>
          <option value="priority-low">Priority Low → High</option>
        </select>
      </div>

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <div key={ticket._id} className="border rounded-lg p-4 md:p-5 bg-white shadow-sm">

            <div className="flex flex-wrap items-center gap-2 mb-2">

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
              Category: {ticket.category} • Created:{" "}
              {new Date(ticket.createdAt).toLocaleDateString()}
            </p>
            <div className="mt-3 flex gap-3">
            <button
                onClick={() => handleDelete(ticket._id)}
                className="px-3 py-1 border rounded text-sm text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
              </div>
          </div>
        ))}

        {tickets.length === 0 && <p className="text-gray-500">No tickets found</p>}
      </div>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-6">

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

      {isFilterOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start pt-20">
          <div className="bg-white w-[90%] sm:w-[420px] rounded-xl shadow-lg p-6 relative">

            <h2 className="text-xl font-semibold mb-4">Filters</h2>

            <div className="mb-5">
              <label className="font-medium">Status</label>
              <div
                className="mt-2 border p-2 rounded-md flex justify-between items-center cursor-pointer"
                onClick={() => toggleDropdown("status")}
              >
                <span className="capitalize">{status === "all" ? "All" : status}</span>

                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 7l5 5 5-5H5z" />
                </svg>
              </div>

              {dropdown.status && (
                <div className="border rounded-md mt-1 bg-white shadow">
                  {["all", "open", "in-progress", "resolved", "closed"].map((s) => (
                    <div
                      key={s}
                      className="p-2 hover:bg-gray-100 cursor-pointer capitalize"
                      onClick={() => {
                        setStatus(s);
                        toggleDropdown("status");
                        setPage(1);
                      }}
                    >
                      {s === "all" ? "All" : s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="font-medium">Priority</label>
              <div
                className="mt-2 border p-2 rounded-md flex justify-between items-center cursor-pointer"
                onClick={() => toggleDropdown("priority")}
              >
                <span className="capitalize">{priority === "all" ? "All" : priority}</span>

                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 7l5 5 5-5H5z" />
                </svg>
              </div>

              {dropdown.priority && (
                <div className="border rounded-md mt-1 bg-white shadow">
                  {["all", "high", "medium", "low"].map((p) => (
                    <div
                      key={p}
                      className="p-2 hover:bg-gray-100 cursor-pointer capitalize"
                      onClick={() => {
                        setPriority(p);
                        toggleDropdown("priority");
                        setPage(1);
                      }}
                    >
                      {p === "all" ? "All" : p}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="font-medium">Category</label>
              <div
                className="mt-2 border p-2 rounded-md flex justify-between items-center cursor-pointer"
                onClick={() => toggleDropdown("category")}
              >
                <span className="capitalize">{category === "all" ? "All" : category}</span>

                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 7l5 5 5-5H5z" />
                </svg>
              </div>

              {dropdown.category && (
                <div className="border rounded-md mt-1 bg-white shadow">
                  {["all", "Technical", "Billing", "General"].map((c) => (
                    <div
                      key={c}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setCategory(c);
                        toggleDropdown("category");
                        setPage(1);
                      }}
                    >
                      {c === "all" ? "All" : c}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 rounded-md border bg-gray-100 hover:bg-gray-200"
                onClick={() => {
                  setStatus("all");
                  setPriority("all");
                  setCategory("all");
                  setPage(1);
                }}
              >
                Clear
              </button>

              <button
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setIsFilterOpen(false)}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateTicketModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={() => {
          setOpenModal(false);
          fetchTickets();
        }}
      />
    </div>
    </UserLayoutClient>
  );
}
