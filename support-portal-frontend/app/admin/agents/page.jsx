"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Ticket,
  Star,
  Shield,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Mail,
  Award,
  Circle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/utils/axiosInstance";

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAgent, setSelectedAgent] = useState(null);

  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/agents");
      const data = res.data;
      setAgents(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error("Failed to load agents:", err);
      setError(err.response?.data?.detail || "Failed to load agents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        (agent.name && agent.name.toLowerCase().includes(q)) ||
        (agent.email && agent.email.toLowerCase().includes(q)) ||
        (agent.role && agent.role.toLowerCase().includes(q)) ||
        (agent.skills && agent.skills.some((s) => s.toLowerCase().includes(q)));

      const matchesStatus =
        statusFilter === "ALL" ||
        (agent.status && agent.status.toLowerCase() === statusFilter.toLowerCase());

      return matchesSearch && matchesStatus;
    });
  }, [agents, search, statusFilter]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
      case "online":
        return "bg-emerald-500";
      case "busy":
        return "bg-amber-500";
      case "away":
      case "break":
        return "bg-orange-400";
      default:
        return "bg-stone-300";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-2">Support Agent Directory</h1>
          <p className="text-stone-500 font-medium text-sm">
            View active support personnel, workloads, availability, and skills.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/10 shadow-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="available">Available / Online</option>
            <option value="busy">Busy</option>
            <option value="away">Away</option>
            <option value="offline">Offline</option>
          </select>

          {/* Search Box */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, skill, email..."
              className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all w-64 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
          <p className="text-sm font-medium text-stone-500">Loading agent directory from database...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-800 font-medium text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchAgents}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAgents.length === 0 && (
        <div className="text-center py-20 bg-stone-50/50 border border-dashed border-stone-200 rounded-3xl p-8 space-y-4">
          <div className="w-16 h-16 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Users className="w-8 h-8 text-stone-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-stone-800">
              {search || statusFilter !== "ALL" ? "No matching agents found" : "No agents registered"}
            </h3>
            <p className="text-sm text-stone-500 max-w-sm mx-auto">
              {search || statusFilter !== "ALL"
                ? "Try adjusting your search criteria or status filter."
                : "Active support agents in your organization will be listed here."}
            </p>
          </div>
        </div>
      )}

      {/* Agent Cards Grid */}
      {!loading && !error && filteredAgents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAgents.map((agent, i) => {
            const initials = agent.name
              ? agent.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "AG";

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedAgent(agent)}
                className="group relative bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:border-stone-400 hover:shadow-md transition-all flex flex-col cursor-pointer"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center group-hover:bg-stone-100 transition-colors duration-300">
                      <span className="text-2xl font-bold text-stone-400 group-hover:text-stone-800 transition-colors">
                        {initials}
                      </span>
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white shadow-sm ${getStatusColor(
                        agent.status
                      )}`}
                      title={agent.status || "offline"}
                    />
                  </div>

                  <div className="space-y-1 mb-4">
                    <h3 className="text-lg font-bold text-stone-900 group-hover:text-stone-700 transition-colors line-clamp-1">
                      {agent.name}
                    </h3>
                    <div className="flex items-center justify-center gap-1.5 text-stone-500 font-semibold text-[11px] uppercase tracking-wider">
                      <Shield className="w-3 h-3 text-stone-600" />
                      <span>{agent.job_title || agent.role}</span>
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100 mb-4">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-700">
                      <Ticket className="w-3.5 h-3.5 text-stone-400" />
                      <span>{agent.active_tickets} active</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-700">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{agent.rating} CSAT</span>
                    </div>
                  </div>

                  {/* Skills badges */}
                  <div className="flex flex-wrap justify-center gap-1 mt-auto">
                    {agent.skills && agent.skills.length > 0 ? (
                      agent.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-stone-400 italic">No specific skills tagged</span>
                    )}
                    {agent.skills && agent.skills.length > 3 && (
                      <span className="text-[10px] font-semibold bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded-md">
                        +{agent.skills.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-stone-900">Agent Details</h3>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-xl font-bold text-stone-600 shrink-0">
                    {selectedAgent.name ? selectedAgent.name.slice(0, 2).toUpperCase() : "AG"}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-stone-900">{selectedAgent.name}</h4>
                    <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5" /> {selectedAgent.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-stone-100 px-2 py-0.5 rounded-full text-stone-600">
                        <Circle className={`w-2 h-2 ${getStatusColor(selectedAgent.status)} rounded-full fill-current`} />
                        {selectedAgent.status || "OFFLINE"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Role</div>
                    <div className="text-sm font-bold text-stone-900 mt-0.5">{selectedAgent.role}</div>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Experience</div>
                    <div className="text-sm font-bold text-stone-900 mt-0.5">{selectedAgent.experience}</div>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Active Load</div>
                    <div className="text-sm font-bold text-stone-900 mt-0.5">{selectedAgent.active_tickets} Tickets</div>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Satisfaction</div>
                    <div className="text-sm font-bold text-stone-900 mt-0.5">{selectedAgent.rating} / 5.0</div>
                  </div>
                </div>

                {selectedAgent.skills && selectedAgent.skills.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-stone-500" /> Verified Skills
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAgent.skills.map((s, idx) => (
                        <span key={idx} className="text-xs font-semibold bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="w-full py-2.5 bg-stone-900 text-white font-bold text-sm rounded-xl hover:bg-stone-800 transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
