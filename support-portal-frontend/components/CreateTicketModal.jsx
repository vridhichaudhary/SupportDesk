// components/CreateTicketModal.jsx
"use client";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function CreateTicketModal({ open, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Technical");
  const [priority, setPriority] = useState("High");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Subject is required");
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post("/tickets", {
        title: title.trim(),
        description,
        category,
        priority,
      });

      onCreated && onCreated(res.data.ticket);
      // reset & close
      setTitle("");
      setDescription("");
      setCategory("Technical");
      setPriority("High");
      onClose();
    } catch (err) {
      console.error("create ticket error", err);
      const msg = err?.response?.data?.message || "Failed to create ticket";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-20">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6 mx-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Create New Ticket</h3>
            <p className="text-sm text-gray-500">Describe your issue and we'll help you resolve it</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              value={title}
              onChange={(e)=>setTitle(e.target.value)}
              placeholder="Brief description of your issue"
              className="mt-1 w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select value={category} onChange={(e)=>setCategory(e.target.value)}
                className="mt-1 w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option>Technical</option>
                <option>Billing</option>
                <option>General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select value={priority} onChange={(e)=>setPriority(e.target.value)}
                className="mt-1 w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={5}
              className="mt-1 w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
