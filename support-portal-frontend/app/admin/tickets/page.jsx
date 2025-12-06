"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import ReassignDropdown from "@/components/admin/ReassignDropdown";
import StatusDropdown from "@/components/admin/StatusDropdown";

export default function AdminAllTickets() {
  const [tickets, setTickets] = useState([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function fetchTickets() {
    try {
      const params = {
        page,
        limit: 10,
      };

      if (search.trim()) params.q = search;
      if (status !== "all") params.status = status;
      if (priority !== "all") params.priority = priority;
      if (category !== "all") params.category = category;

      const res = await axiosInstance.get("/tickets", { params });

      setTickets(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, [search, status, priority, category, page]);

  const handleDelete = async (id) => {
  if (!confirm("Delete this ticket?")) return;
  await axiosInstance.delete(`/admin/tickets/${id}`);
  fetchTickets();
};

  const badge = {
    open: "bg-blue-100 text-blue-700",
    "in-progress": "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-gray-200 text-gray-600",

    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold mb-1">All Tickets</h1>
      <p className="text-gray-600 mb-6">Manage and assign support tickets</p>

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search tickets by ID or subject"
          className="border rounded-lg px-4 py-2 bg-white w-80"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="border rounded-lg px-4 py-2 bg-white"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          className="border rounded-lg px-4 py-2 bg-white"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          className="border rounded-lg px-4 py-2 bg-white"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Categories</option>
          <option value="Technical">Technical</option>
          <option value="Billing">Billing</option>
          <option value="General">General</option>
        </select>
      </div>

      <div className="space-y-4">
        {tickets.map((t) => (
          <div
            key={t._id}
            className="bg-white border rounded-xl p-6 shadow-sm"
          >
            <div className="flex justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">{t.ticketId}</span>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${badge[t.status]}`}
                  >
                    {t.status}
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${badge[t.priority?.toLowerCase()]}`}
                  >
                    {t.priority}
                  </span>

                  <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                    {t.category}
                  </span>
                </div>

                <h3 className="text-lg font-semibold">{t.title}</h3>

                <p className="text-gray-500 text-sm mt-1">
                  Created: {new Date(t.createdAt).toLocaleDateString()}
                </p>

                <p className="text-gray-700 text-sm mt-1">
                  Assigned to:{" "}
                  <span className="font-medium">
                    {t.assignedTo ? t.assignedTo.name : "Not Assigned"}
                  </span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                    <ReassignDropdown ticket={t} onAssigned={fetchTickets} />
                    <StatusDropdown ticket={t} onUpdated={fetchTickets} />
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="px-4 py-2 border rounded text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>

                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-3 mt-6">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-4 py-2 border rounded-md bg-white disabled:opacity-40"
        >
          Prev
        </button>

        <div className="px-4 py-2 font-medium">
          Page {page} of {totalPages}
        </div>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 border rounded-md bg-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
