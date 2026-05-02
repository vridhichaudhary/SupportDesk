"use client";
import { useState, useEffect, useRef } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { Activity, Loader2, Check, ChevronRight, CircleDot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UpdateStatusDropdown({ ticket, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(null);
  const dropdownRef = useRef(null);

  const statuses = [
    { value: "open", label: "Open", color: "text-sky-500", bg: "bg-sky-50" },
    { value: "in-progress", label: "Pending", color: "text-amber-500", bg: "bg-amber-50" },
    { value: "resolved", label: "Resolved", color: "text-emerald-500", bg: "bg-emerald-50" },
    { value: "closed", label: "Closed", color: "text-stone-500", bg: "bg-stone-50" },
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function updateStatus(statusValue) {
    if (loadingStatus) return;
    try {
      setLoadingStatus(statusValue);
      await axiosInstance.put(`/admin/tickets/${ticket._id}`, {
        status: statusValue,
      });
      setOpen(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setLoadingStatus(null);
    }
  }

  const toggleDropdown = () => setOpen(!open);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        disabled={loadingStatus !== null}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-50 transition-all active:scale-95 shadow-sm disabled:opacity-50"
      >
        {loadingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
        Update Status
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute right-0 mt-3 w-56 bg-white shadow-2xl border border-stone-200 rounded-2xl p-2 z-[110] overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-stone-50 mb-1">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Select Status</p>
            </div>

            <div className="grid grid-cols-1 gap-1">
              {statuses.map((status) => (
                <button
                  key={status.value}
                  onClick={() => updateStatus(status.value)}
                  disabled={loadingStatus !== null}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
                    ticket.status === status.value
                      ? "bg-stone-50 text-stone-900 pointer-events-none"
                      : "hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                      ticket.status === status.value ? "bg-white border-stone-200" : "bg-white border-stone-100 group-hover:border-stone-200"
                    }`}>
                      <CircleDot className={`w-4 h-4 ${status.color}`} />
                    </div>
                    <p className="text-xs font-bold leading-none">{status.label}</p>
                  </div>
                  {loadingStatus === status.value ? (
                    <Loader2 className="w-3 h-3 animate-spin text-stone-400" />
                  ) : ticket.status === status.value ? (
                    <Check className="w-3.5 h-3.5 text-stone-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-stone-300 group-hover:text-stone-400 transition-colors" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
