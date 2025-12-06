"use client";

import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function StatusDropdown({ ticket, onUpdated }) {
  const [open, setOpen] = useState(false);

  const updateStatus = async (newStatus) => {
    try {
      await axiosInstance.put(`/tickets/${ticket._id}`, {
        status: newStatus,
      });

      setOpen(false);
      onUpdated();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status");
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50"
      >
        Status
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg border rounded-md z-20">
          <button
            onClick={() => updateStatus("in-progress")}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Mark In Progress
          </button>
          <button
            onClick={() => updateStatus("resolved")}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Mark Resolved
          </button>
          <button
            onClick={() => updateStatus("closed")}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Close Ticket
          </button>
        </div>
      )}
    </div>
  );
}
