"use client";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, AlertTriangle, FileText, Tag, BarChart2, Loader2, Layers } from "lucide-react";

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
      setError("Please provide a subject for your request.");
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
      setTitle("");
      setDescription("");
      setCategory("Technical");
      setPriority("High");
      onClose();
    } catch (err) {
      console.error("Create ticket error", err);
      const msg = err?.response?.data?.message || "Ticket creation failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-900/10 backdrop-blur-[2px]"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="bg-white w-full max-w-xl rounded-2xl shadow-xl shadow-stone-200/50 overflow-hidden relative z-10 border border-stone-200"
        >
          <div className="px-8 pt-8 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-accent-50 rounded-lg border border-accent-100">
                  <FileText className="w-4 h-4 text-accent-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 tracking-tight">Create Request</h3>
              </div>
              <p className="text-stone-500 font-medium text-xs">Fill out the details below to initialize support.</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-stone-50 rounded-lg transition-colors text-stone-400 hover:text-stone-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 space-y-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Subject</label>
                <div className="relative group">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-accent-600 transition-colors" />
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary of the issue"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-accent-600 focus:border-accent-600 outline-none transition-all text-sm font-semibold text-stone-700 placeholder:text-stone-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Category</label>
                  <div className="relative">
                    <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 pointer-events-none" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-accent-600 focus:border-accent-600 outline-none transition-all text-sm font-semibold text-stone-700 appearance-none"
                    >
                      <option>Technical</option>
                      <option>Billing</option>
                      <option>General</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Priority</label>
                  <div className="relative">
                    <BarChart2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 pointer-events-none" />
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-accent-600 focus:border-accent-600 outline-none transition-all text-sm font-semibold text-stone-700 appearance-none"
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Provide more details about your request..."
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-accent-600 focus:border-accent-600 outline-none transition-all text-sm font-medium text-stone-700 placeholder:text-stone-300 resize-none"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-[13px] font-semibold"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-stone-400 font-bold hover:text-stone-900 transition-colors text-xs uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-stone-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-stone-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Initialize Request
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

