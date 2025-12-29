"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import CreateTicketModal from "@/components/CreateTicketModal";
import UserLayoutClient from "../layoutClient";
import StatCard from "@/components/StatCard";
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ticket as TicketIcon,
  ChevronRight,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UserDashboard() {
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/tickets?mine=true&limit=100&page=1");
      const items = res.data.items || [];

      const open = items.filter((t) => t.status === "open").length;
      const inProgress = items.filter((t) => t.status === "in-progress").length;
      const resolved = items.filter((t) => t.status === "resolved").length;

      const sorted = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRecent(sorted.slice(0, 5));

      setStats({ open, inProgress, resolved });
    } catch (err) {
      console.error("Dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <UserLayoutClient>
      <div className="p-8 max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">
              Success <span className="gradient-text">Overview</span>
            </h1>
            <p className="text-slate-500 font-medium text-lg">Manage your support experience with ease.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Initialize Request
            </button>
          </motion.div>
        </div>

        <CreateTicketModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={fetchDashboard}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Active Requests"
            value={stats.open}
            icon={AlertCircle}
            colorClass="bg-blue-600"
          />
          <StatCard
            title="In Processing"
            value={stats.inProgress}
            icon={Clock}
            colorClass="bg-amber-500"
          />
          <StatCard
            title="Fulfilled"
            value={stats.resolved}
            icon={CheckCircle2}
            colorClass="bg-emerald-500"
          />
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-10"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recent Activity</h2>
              <p className="text-slate-400 font-medium">Tracking your latest interactions</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-2 border border-slate-100">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Locate ticket..."
                className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-300 w-32 focus:w-48 transition-all"
              />
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-accent-600" />
                <span className="font-bold uppercase tracking-widest text-xs">Synchronizing Data...</span>
              </div>
            ) : recent.length === 0 ? (
              <div className="py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                  <TicketIcon className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">No Activity Found</h3>
                <p className="text-slate-400 max-w-xs px-4">You haven't initiated any support requests yet. Use the button above to get started.</p>
              </div>
            ) : (
              recent.map((t, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  key={t._id}
                  className="group flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-3xl border border-slate-100 hover:border-accent-200 hover:bg-slate-50/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${t.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' :
                        t.status === 'in-progress' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                      <TicketIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.ticketId}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tighter ${t.priority?.toLowerCase() === 'high' ? 'bg-rose-100 text-rose-600' :
                            t.priority?.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                          {t.priority}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-lg group-hover:text-accent-600 transition-colors">{t.title}</h4>
                      <p className="text-sm text-slate-400 font-medium">
                        {t.category} • {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0 flex items-center gap-4">
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${t.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        t.status === 'in-progress' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                      {t.status}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </UserLayoutClient>
  );
}

