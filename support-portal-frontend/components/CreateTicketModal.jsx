"use client";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function CreateTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", description: "", category: "Technical", priority: "Low" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("Title required"); return; }
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await axiosInstance.post("/tickets", form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onCreated && onCreated(res.data.ticket);
    } catch (err) {
      console.error("create ticket error", err);
      setError(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Create New Ticket</h3>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block mb-2">Subject</label>
          <input name="title" value={form.title} onChange={handleChange} className="w-full p-3 border rounded mb-3" placeholder="Short description" />

          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block mb-2">Category</label>
              <select name="category" value={form.category} onChange={handleChange} className="w-full p-3 border rounded">
                <option>Technical</option>
                <option>Billing</option>
                <option>General</option>
              </select>
            </div>
            <div className="w-40">
              <label className="block mb-2">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="w-full p-3 border rounded">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          <label className="block mb-2">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={5} className="w-full p-3 border rounded mb-3" placeholder="Provide details"></textarea>

          {error && <div className="text-red-700 bg-red-100 p-2 rounded mb-3">{error}</div>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-green-600 text-white rounded">{isLoading ? "Creating..." : "Create Ticket"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
