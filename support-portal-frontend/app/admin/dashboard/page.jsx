"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import StatCard from "@/components/StatCard";
import {
  Users,
  Ticket as TicketIcon,
  CheckCircle2,
  Clock,
  BarChart3,
  ArrowUpRight,
  Loader2,
  Calendar,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/admin/dashboard");
      setStats(res.data.stats);
      setRecent(res.data.recent);
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !stats) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-accent-100 border-t-accent-600 rounded-full animate-spin"></div>
        <BarChart3 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-accent-600" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Initializing Command Center</h3>
        <p className="text-slate-400 text-xs font-bold">Synchronizing global support metrics...</p>
      </div>
    </div>
  );

  return (
    <div className="p-10 max-w-[1600px] mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">Admin <span className="gradient-text">Intelligence</span></h1>
          </div>
          <p className="text-slate-500 font-medium text-lg ml-11">Orchestrating excellence across all support channels.</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Global Volume" value={stats.total} icon={TicketIcon} colorClass="bg-slate-900" />
        <StatCard title="Active Requests" value={stats.open} icon={AlertCircle} colorClass="bg-indigo-600" />
        <StatCard title="Resolved" value={stats.resolved} icon={CheckCircle2} colorClass="bg-emerald-500" />
        <StatCard title="In Progress" value={stats.inProgress} icon={Clock} colorClass="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="xl:col-span-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-10"
        >
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6 flex items-center gap-2">
            Category <span className="text-indigo-600">Distribution</span>
          </h2>
          <div className="space-y-8">
            {stats.categories.map((cat, idx) => {
              const totalItems = stats.categories.reduce((s, c) => s + c.count, 0);
              const percent = ((cat.count / totalItems) * 100).toFixed(0);
              return (
                <div key={cat._id} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{cat._id}</div>
                      <div className="text-2xl font-black text-slate-900">{cat.count} <span className="text-sm text-slate-400 font-bold ml-1">leads</span></div>
                    </div>
                    <div className="text-lg font-black text-indigo-600">{percent}%</div>
                  </div>
                  <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ delay: 0.3 + (idx * 0.1), duration: 1 }}
                      className="h-full bg-indigo-600 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-10 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Stream</h2>
            <button className="text-accent-600 font-bold text-sm hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">ID</th>
                  <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Description</th>
                  <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="pb-4 text-xs font-black text-slate-400 uppercase tracking-widest">Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recent.map((t, idx) => (
                  <motion.tr
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + (idx * 0.05) }}
                    key={t._id}
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-5 pr-4 shrink-0">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-black">{t.ticketId}</span>
                    </td>
                    <td className="py-5 pr-4 max-w-xs">
                      <div className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{t.title}</div>
                      <div className="text-xs font-medium text-slate-400">{t.category} • {new Date(t.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="py-5 pr-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${t.status === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          t.status === 'in-progress' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-black text-white">
                          {t.assignedTo?.name ? t.assignedTo.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{t.assignedTo?.name || "Pending..."}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

