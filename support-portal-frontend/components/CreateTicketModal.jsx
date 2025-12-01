"use client";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function CreateTicketModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Technical");
  const [priority, setPriority] = useState("High");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Subject is required");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await axiosInstance.post(
        "/tickets",
        { title, description, category, priority },
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }
      );

      onCreated && onCreated(res.data.ticket);
      onClose && onClose();
      // clear fields
      setTitle("");
      setDescription("");
      setCategory("Technical");
      setPriority("High");
    } catch (err) {
      console.error("Create ticket error:", err);
      setError(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold">Create New Ticket</h3>
            <p className="text-gray-600">Describe your issue and we'll help you resolve it</p>
          </div>
          <button onClick={onClose} className="text-gray-500 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block mb-2 font-medium">Subject</label>
          <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full p-3 border rounded mb-4" placeholder="Brief description of your issue" />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-2 font-medium">Category</label>
              <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full p-3 border rounded">
                <option>Technical</option>
                <option>Billing</option>
                <option>General</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">Priority</label>
              <select value={priority} onChange={(e)=>setPriority(e.target.value)} className="w-full p-3 border rounded">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          <label className="block mb-2 font-medium">Description</label>
          <textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={6} className="w-full p-3 border rounded mb-4" placeholder="Provide detailed information about your issue"></textarea>

          {error && <div className="text-red-700 bg-red-100 p-3 rounded mb-4">{error}</div>}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
            <button disabled={loading} type="submit" className="px-6 py-2 bg-green-600 text-white rounded">
              {loading ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
