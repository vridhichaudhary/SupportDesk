"use client";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export default function NewTicketModal({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const toggle = () => setOpen((v) => !v);

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { title, description, priority, status: "open" };
      const res = await axiosInstance.post("/api/tickets", payload, {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      onCreated && onCreated(res.data);
      setOpen(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
    } catch (err) {
      console.error("Create ticket error:", err);
      alert("Failed to create ticket");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={toggle} className="bg-green-600 text-white px-4 py-2 rounded-lg">+ New Ticket</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <form onSubmit={handleCreate} className="bg-[#0b0b0b] w-full max-w-lg p-6 rounded-lg border border-[#222]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Create New Ticket</h3>
              <button type="button" onClick={toggle} className="text-gray-400">Close</button>
            </div>

            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full p-3 rounded mb-3 bg-black/40 border border-[#222] text-white" required />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue" className="w-full p-3 rounded mb-3 bg-black/40 border border-[#222] text-white" rows={5} required />
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="p-3 rounded mb-3 bg-black/40 border border-[#222] text-white">
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={toggle} className="px-4 py-2 rounded border text-gray-300">Cancel</button>
              <button disabled={loading} type="submit" className="px-4 py-2 rounded bg-green-600 text-white">{loading ? "Creating..." : "Create"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
