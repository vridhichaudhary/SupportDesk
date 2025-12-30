"use client";
import { useState, useEffect, useRef } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { UserPlus, Shield, Loader2, Check, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ReassignDropdown({ ticket, onAssigned }) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchAgents() {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/admin/agents");
      setAgents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load agents:", err);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }

  async function assignTo(agentId) {
    if (assigningId) return;
    try {
      setAssigningId(agentId);
      await axiosInstance.put(`/admin/tickets/${ticket._id}`, {
        assignedTo: agentId,
      });
      setOpen(false);
      if (onAssigned) onAssigned();
    } catch (err) {
      console.error("Failed to assign:", err);
      alert("Failed to assign ticket. Please try again.");
    } finally {
      setAssigningId(null);
    }
  }

  const toggleDropdown = () => {
    const nextState = !open;
    setOpen(nextState);
    if (nextState) fetchAgents();
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-all active:scale-95 shadow-lg shadow-stone-200/50 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
        {ticket.assignedTo ? "Reassign Agent" : "Assign Agent"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute right-0 mt-3 w-64 bg-white shadow-2xl border border-stone-200 rounded-2xl p-2 z-[110] overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-stone-50 mb-1">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Select Personnel</p>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {loading && agents.length === 0 ? (
                <div className="p-4 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-stone-300" />
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Indexing Agents...</p>
                </div>
              ) : agents.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs font-bold text-stone-400">No agents found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1">
                  {agents.map((agent) => (
                    <button
                      key={agent._id}
                      onClick={() => assignTo(agent._id)}
                      disabled={assigningId !== null}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group ${ticket.assignedTo?._id === agent._id
                          ? "bg-accent-50/50 text-accent-700 pointer-events-none"
                          : "hover:bg-stone-50 text-stone-700"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${ticket.assignedTo?._id === agent._id
                            ? "bg-white border-accent-200"
                            : "bg-white border-stone-100 group-hover:border-stone-200"
                          }`}>
                          <Shield className={`w-4 h-4 ${ticket.assignedTo?._id === agent._id ? "text-accent-600" : "text-stone-400"
                            }`} />
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-none mb-0.5">{agent.name}</p>
                          <p className="text-[9px] font-medium text-stone-400 uppercase tracking-tight">Active Duty</p>
                        </div>
                      </div>
                      {assigningId === agent._id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-stone-400" />
                      ) : ticket.assignedTo?._id === agent._id ? (
                        <Check className="w-3.5 h-3.5 text-accent-600" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-stone-300 group-hover:text-stone-400 transition-colors" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
