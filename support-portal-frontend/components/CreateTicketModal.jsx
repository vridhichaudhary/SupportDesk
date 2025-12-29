"use client";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, AlertTriangle, CheckCircle2, FileText, Tag, BarChart2, Loader2 } from "lucide-react";

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
      setError("⚠️ Subject header is mandatory for initialization.");
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
      const msg = err?.response?.data?.message || "Protocol error: Ticket creation failed.";
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
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-3xl shadow-black/20 overflow-hidden relative z-10 border border-slate-100"
        >
          <div className="bg-slate-900 p-10 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-full bg-accent-500/10 blur-3xl pointer-events-none"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <FileText className="w-5 h-5 text-accent-500" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tight">Initialize <span className="text-accent-500 italic">Request</span></h3>
                </div>
                <p className="text-slate-400 font-medium">Define your parameters for support intervention.</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-white">
            <div className="space-y-6">
              <div className="relative group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Subject Header</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-accent-600 transition-colors" />
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Infrastructure Latency Issue"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-accent-600 focus:border-transparent outline-none transition-all text-slate-700 font-bold placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Classification</label>
                  <div className="relative">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-accent-600 transition-colors pointer-events-none" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-accent-600 focus:border-transparent outline-none transition-all text-slate-700 font-bold appearance-none"
                    >
                      <option>Technical</option>
                      <option>Billing</option>
                      <option>General</option>
                    </select>
                  </div>
                </div>
                <div className="group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Priority Scale</label>
                  <div className="relative">
                    <BarChart2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-accent-600 transition-colors pointer-events-none" />
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-accent-600 focus:border-transparent outline-none transition-all text-slate-700 font-bold appearance-none"
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Detailed Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Provide comprehensive details regarding the operative issue..."
                  className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:bg-white focus:ring-2 focus:ring-accent-600 focus:border-transparent outline-none transition-all text-slate-700 font-medium placeholder:text-slate-300 resize-none"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl text-sm font-bold"
                >
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-4 text-slate-500 font-bold hover:text-slate-900 transition-colors uppercase tracking-widest text-xs"
              >
                Cancel Protocol
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Initialize
                    <Send className="w-5 h-5" />
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

