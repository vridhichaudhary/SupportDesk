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

  const reset = () => {
    setTitle("");
    setCategory("Technical");
    setPriority("High");
    setDescription("");
    setError("");
  };

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("Subject is required"); return; }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated. Please login.");
        setTimeout(() => (window.location.href = "/login"), 900);
        return;
      }

      const payload = {
        title: title.trim(),
        description,
        category,
        priority
      };

      const res = await axiosInstance.post("/tickets", payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const createdTicket = res.data.ticket || res.data; // support both shapes
      onCreated && onCreated(createdTicket);
      reset();
      onClose && onClose();
    } catch (err) {
      console.error("Create ticket error:", err);
      const status = err?.response?.status;
      if (status === 401 || (err?.response?.data?.message && /token|jwt/i.test(err.response.data.message))) {
        // token expired or invalid
        setError("Session expired — please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setTimeout(() => window.location.href = "/login", 1100);
      } else {
        setError(err.response?.data?.message || "Failed to create ticket. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <form onSubmit={handleCreate} className="bg-white rounded-lg w-full max-w-2xl p-8 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">Create New Ticket</h3>
          <button type="button" onClick={() => { reset(); onClose && onClose(); }} className="text-gray-500 text-2xl">✕</button>
        </div>

        <label className="block text-sm font-medium mb-2">Subject</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief description of your issue"
               className="w-full p-3 border rounded mb-4" />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 border rounded">
              <option>Technical</option>
              <option>Billing</option>
              <option>General</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full p-3 border rounded">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
        </div>

        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border rounded mb-4" rows={6}></textarea>

        {error && <div className="mb-4 text-red-700 bg-red-100 p-3 rounded">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => { reset(); onClose && onClose(); }} className="px-4 py-2 border rounded">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-3 bg-green-600 text-white rounded">
            {loading ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
