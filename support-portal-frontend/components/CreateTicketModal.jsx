"use client";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function CreateTicketWhiteModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.category || !form.priority) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      const res = await axiosInstance.post(
        "/tickets",
        {
          title: form.title,
          description: form.description,
          category: form.category,
          priority: form.priority,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      onCreated(res.data.ticket);  
      onClose();                  
    } catch (err) {
      console.log("ERR CREATING:", err);
      setError(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-semibold">Create New Ticket</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit}>

          <label className="block text-gray-700 mb-1">Subject</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Brief description of your issue"
            className="w-full border p-3 rounded mb-4"
          />

          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border p-3 rounded"
              >
                <option value="">Select category</option>
                <option>Technical</option>
                <option>Billing</option>
                <option>General</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-gray-700 mb-1">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full border p-3 rounded"
              >
                <option value="">Select priority</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>

          <label className="block text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            placeholder="Provide detailed information about your issue"
            className="w-full border p-3 rounded mb-4"
          />

          {error && (
            <div className="p-2 mb-4 text-red-700 bg-red-100 border border-red-200 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white p-3 rounded-lg font-medium hover:bg-green-700 transition"
          >
            {loading ? "Creating..." : "Create Ticket"}
          </button>
        </form>
      </div>
    </div>
  );
}
