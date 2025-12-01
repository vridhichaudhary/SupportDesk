"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter States
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");

  // Dropdown control
  const [dropdown, setDropdown] = useState({
    status: false,
    priority: false,
    category: false,
  });

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
        q: search,
        sort,
      };

      if (status !== "all") params.status = status;
      if (priority !== "all") params.priority = priority;
      if (category !== "all") params.category = category;

      const res = await axiosInstance.get("/tickets", { params });
      setTickets(res.data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, sort, status, priority, category]);

  // Badge colors same as your black UI
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
          onClick={() => (window.location.href = "/user/new-ticket")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium shadow hover:bg-blue-700"
        >
          + Create Ticket
        </button>
      </div>

      <p className="text-gray-500 mb-4">Manage your support requests</p>

      {/* SEARCH + FILTERS */}
      <div className="flex gap-3 items-center mb-6">
        {/* Search */}
        <div className="relative w-80">
          {/* search icon svg */}
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
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter button */}
        <button
          className="flex items-center gap-2 px-4 py-2 border rounded-md bg-white hover:bg-gray-50"
          onClick={() => setIsFilterOpen(true)}
        >
          {/* filter svg */}
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

        {/* Sort dropdown */}
        <select
          className="px-3 py-2 border rounded-md bg-white"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="priority-high">Priority: High → Low</option>
          <option value="priority-low">Priority: Low → High</option>
          <option value="status">Status</option>
        </select>
      </div>

      {/* TICKETS */}
      <div className="space-y-4">
        {tickets.map((ticket) => (
          <div
            key={ticket._id}
            className="border rounded-lg shadow-sm p-5 bg-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-900">
                {ticket.ticketId}
              </span>

              {/* status */}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${badgeColors[ticket.status]}`}
              >
                {ticket.status}
              </span>

              {/* priority */}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${badgeColors[ticket.priority]}`}
              >
                {ticket.priority}
              </span>
            </div>

            <h2 className="text-lg font-semibold text-gray-800">
              {ticket.title}
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Category: {ticket.category} • Created:{" "}
              {new Date(ticket.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {/* FILTER POPUP */}
      {isFilterOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start pt-20">
          <div className="bg-white w-[420px] rounded-xl shadow-lg p-6 relative">
            <h2 className="text-xl font-semibold mb-4">Filters</h2>

            {/* STATUS */}
            <div className="mb-5">
              <label className="font-medium">Status</label>
              <div
                className="mt-2 border p-2 rounded-md flex justify-between items-center cursor-pointer"
                onClick={() => toggleDropdown("status")}
              >
                <span className="capitalize">
                  {status === "all" ? "All Statuses" : status}
                </span>

                {/* dropdown arrow */}
                <svg
                  className="w-5 h-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5 7l5 5 5-5H5z" />
                </svg>
              </div>

              {dropdown.status && (
                <div className="border rounded-md mt-1 bg-white shadow">
                  {["all", "open", "in-progress", "resolved", "closed"].map(
                    (val) => (
                      <div
                        key={val}
                        className="p-2 hover:bg-gray-100 cursor-pointer capitalize"
                        onClick={() => {
                          setStatus(val);
                          toggleDropdown("status");
                        }}
                      >
                        {val === "all" ? "All Statuses" : val}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* PRIORITY */}
            <div className="mb-5">
              <label className="font-medium">Priority</label>
              <div
                className="mt-2 border p-2 rounded-md flex justify-between items-center cursor-pointer"
                onClick={() => toggleDropdown("priority")}
              >
                <span className="capitalize">
                  {priority === "all" ? "All Priorities" : priority}
                </span>

                <svg
                  className="w-5 h-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5 7l5 5 5-5H5z" />
                </svg>
              </div>

              {dropdown.priority && (
                <div className="border rounded-md mt-1 bg-white shadow">
                  {["all", "high", "medium", "low"].map((val) => (
                    <div
                      key={val}
                      className="p-2 hover:bg-gray-100 cursor-pointer capitalize"
                      onClick={() => {
                        setPriority(val);
                        toggleDropdown("priority");
                      }}
                    >
                      {val === "all" ? "All Priorities" : val}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CATEGORY */}
            <div className="mb-5">
              <label className="font-medium">Category</label>
              <div
                className="mt-2 border p-2 rounded-md flex justify-between items-center cursor-pointer"
                onClick={() => toggleDropdown("category")}
              >
                <span className="capitalize">
                  {category === "all" ? "All Categories" : category}
                </span>

                <svg
                  className="w-5 h-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5 7l5 5 5-5H5z" />
                </svg>
              </div>

              {dropdown.category && (
                <div className="border rounded-md mt-1 bg-white shadow">
                  {["all", "Technical", "Billing", "General"].map((val) => (
                    <div
                      key={val}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setCategory(val);
                        toggleDropdown("category");
                      }}
                    >
                      {val === "all" ? "All Categories" : val}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BUTTONS */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-4 py-2 rounded-md border bg-gray-100 hover:bg-gray-200"
                onClick={() => {
                  setStatus("all");
                  setPriority("all");
                  setCategory("all");
                }}
              >
                Clear
              </button>

              <button
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setIsFilterOpen(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
