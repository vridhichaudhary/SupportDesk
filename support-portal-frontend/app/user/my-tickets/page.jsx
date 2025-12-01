"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");

  const [dropdown, setDropdown] = useState({
    status: false,
    priority: false,
    category: false,
  });

  const toggleDropdown = (key) => {
    setDropdown((prev) => ({
      status: false,
      priority: false,
      category: false,
      [key]: !prev[key],
    }));
  };

  const fetchTickets = async () => {
    try {
      const res = await axiosInstance.get("/tickets", {
        params: {
          q: search,
          sort,
          status: status !== "all" ? status : undefined,
          priority: priority !== "all" ? priority : undefined,
          category: category !== "all" ? category : undefined,
        },
      });
      setTickets(res.data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, sort, status, priority, category]);

  const badgeColors = {
    open: "bg-blue-100 text-blue-600",
    "in-progress": "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-200 text-gray-600",

    high: "bg-red-100 text-red-600",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>

        <button
          onClick={() => window.location.href = "/user/new-ticket"}
          className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium shadow hover:bg-blue-700"
        >
          + Create Ticket
        </button>
      </div>

      <p className="text-gray-500 mb-4">Manage your support requests</p>

      <div className="flex gap-3 items-center mb-6">
        <div className="relative w-80">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            className="w-full border rounded-md pl-10 pr-3 py-2 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2 border rounded-md bg-white hover:bg-gray-50"
          onClick={() => setIsFilterOpen(true)}
        >
          <FunnelIcon className="w-5 h-5" /> Filters
        </button>

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

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <div
            key={ticket._id}
            className="border rounded-lg shadow-sm p-5 bg-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-900">{ticket.ticketId}</span>

              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${badgeColors[ticket.status]}`}
              >
                {ticket.status}
              </span>

              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${badgeColors[ticket.priority]}`}
              >
                {ticket.priority}
              </span>
            </div>

            <h2 className="text-lg font-semibold text-gray-800">
              {ticket.title}
            </h2>

            <div className="text-gray-500 text-sm mt-1">
              Category: {ticket.category} • Created:{" "}
              {new Date(ticket.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start pt-20">
          <div className="bg-white w-[420px] rounded-xl shadow-lg p-6 relative">
            <h2 className="text-xl font-semibold mb-4">Filters</h2>

            <div className="mb-5">
              <label className="font-medium">Status</label>
              <div
                className="mt-2 border p-2 rounded-md flex justify-between items-center cursor-pointer"
                onClick={() => toggleDropdown("status")}
              >
                <span className="capitalize">{status === "all" ? "All Statuses" : status}</span>
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
              </div>

              {dropdown.status && (
                <div className="border rounded-md mt-1 bg-white shadow">
                  {["all", "open", "in-progress", "resolved", "closed"].map((val) => (
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
                <span className="capitalize">{priority === "all" ? "All Priorities" : priority}</span>
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
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

            <div className="mb-5">
              <label className="font-medium">Category</label>
              <div
                className="mt-2 border p-2 rounded-md flex justify-between items-center cursor-pointer"
                onClick={() => toggleDropdown("category")}
              >
                <span className="capitalize">{category === "all" ? "All Categories" : category}</span>
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
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
