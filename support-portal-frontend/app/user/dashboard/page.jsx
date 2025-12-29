"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import CreateTicketModal from "@/components/CreateTicketModal";
import UserLayoutClient from "../layoutClient";
import StatCard from "@/components/StatCard";
import {
  Plus,
  Search,
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
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-stone-900 tracking-tight mb-1">
              Terminal <span className="text-accent-600">Overview</span>
            </h1>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-stone-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-stone-800 transition-colors shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create Request
          </button>
        </div>

        <CreateTicketModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={fetchDashboard}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Active"
            value={stats.open}
            icon={AlertCircle}
          />
          <StatCard
            title="Processing"
            value={stats.inProgress}
            icon={Clock}
          />
          <StatCard
            title="Fulfilled"
            value={stats.resolved}
            icon={CheckCircle2}
          />
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Recent Activity</h2>
              <p className="text-stone-500 text-xs font-medium mt-0.5">Your most recent ticket interactions</p>
            </div>
            <div className="p-2 bg-stone-50 rounded-lg flex items-center gap-2 border border-stone-100">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Filter items..."
                className="bg-transparent border-none outline-none text-[13px] font-semibold text-stone-700 placeholder:text-stone-300 w-32 focus:w-48 transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-400">
                <Loader2 className="w-8 h-8 animate-spin text-accent-600" />
                <span className="font-bold uppercase tracking-widest text-[10px]">Syncing...</span>
              </div>
            ) : recent.length === 0 ? (
              <div className="py-20 bg-stone-50 rounded-2xl border border-dashed border-stone-200 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 border border-stone-100">
                  <TicketIcon className="w-6 h-6 text-stone-300" />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-1">No Activity Found</h3>
                <p className="text-stone-400 text-sm max-w-xs px-4">Initialize a support request to see it here.</p>
              </div>
            ) : (
              recent.map((t) => (
                <div
                  key={t._id}
                  className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl border border-stone-100 hover:border-accent-200 hover:bg-stone-50/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-400 group-hover:text-accent-600 group-hover:border-accent-100 transition-colors">
                      <TicketIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t.ticketId}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${t.priority?.toLowerCase() === 'high' ? 'bg-rose-50 text-rose-600' :
                          t.priority?.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-stone-100 text-stone-600'
                          }`}>
                          {t.priority}
                        </span>
                      </div>
                      <h4 className="font-bold text-stone-900 text-base group-hover:text-accent-600 transition-colors leading-tight">{t.title}</h4>
                      <p className="text-xs text-stone-500 font-medium">
                        {t.category} • {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0 flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${t.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      t.status === 'in-progress' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                        'bg-stone-50 text-stone-700 border-stone-200'
                      }`}>
                      {t.status}
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-900 transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </UserLayoutClient>
  );
}

