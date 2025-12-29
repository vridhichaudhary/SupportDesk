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
  AlertCircle,
  Command
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50">
      <div className="relative">
        <div className="w-12 h-12 border-2 border-stone-200 border-t-accent-600 rounded-full animate-spin"></div>
        <Command className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <h3 className="font-bold text-stone-900 uppercase tracking-widest text-[10px]">Initializing Terminal</h3>
        <p className="text-stone-400 text-[10px] font-medium uppercase tracking-widest">Global Sync in Progress...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight mb-1">
            System <span className="text-accent-600">Executive</span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Volume" value={stats.total} icon={TicketIcon} />
        <StatCard title="Active" value={stats.open} icon={AlertCircle} />
        <StatCard title="Fulfilled" value={stats.resolved} icon={CheckCircle2} />
        <StatCard title="Processing" value={stats.inProgress} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
          <h2 className="text-xl font-bold text-stone-900 tracking-tight mb-6">
            Load <span className="text-accent-600">Distribution</span>
          </h2>
          <div className="space-y-6">
            {stats.categories.map((cat, idx) => {
              const totalItems = stats.categories.reduce((s, c) => s + c.count, 0);
              const percent = ((cat.count / totalItems) * 100).toFixed(0);
              return (
                <div key={cat._id} className="space-y-2">
                  <div className="flex justify-between items-end px-0.5">
                    <div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">{cat._id}</div>
                      <div className="text-xl font-bold text-stone-900 leading-none">{cat.count} <span className="text-[10px] text-stone-400 font-bold ml-1 uppercase">Tickets</span></div>
                    </div>
                    <div className="text-sm font-bold text-accent-600">{percent}%</div>
                  </div>
                  <div className="h-1.5 bg-stone-50 rounded-full overflow-hidden border border-stone-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ delay: idx * 0.1, duration: 1 }}
                      className="h-full bg-accent-600 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Active Operation Stream</h2>
            <button className="text-accent-600 font-bold text-xs uppercase tracking-widest hover:underline flex items-center gap-1.5 transition-all">
              Full Log <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="pb-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Reference</th>
                  <th className="pb-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Definition</th>
                  <th className="pb-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Status</th>
                  <th className="pb-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {recent.map((t) => (
                  <tr key={t._id} className="group hover:bg-stone-50/50 transition-colors">
                    <td className="py-4 pr-4">
                      <span className="bg-stone-50 text-stone-600 border border-stone-200 px-2 py-0.5 rounded text-[10px] font-bold">{t.ticketId}</span>
                    </td>
                    <td className="py-4 pr-4 max-w-xs">
                      <div className="font-bold text-stone-900 text-sm truncate group-hover:text-accent-600 transition-colors">{t.title}</div>
                      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">{t.category} • {new Date(t.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all ${t.status === 'open' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                        t.status === 'in-progress' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-stone-900 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                          {t.assignedTo?.name ? t.assignedTo.name.charAt(0) : '?'}
                        </div>
                        <span className="text-xs font-bold text-stone-700">{t.assignedTo?.name || "Unassigned"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

