"use client";
import TicketItem from "./TicketItem";
import { Loader2, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { motion } from "framer-motion";

export default function TicketList({ loading, data = { items: [], total: 0 }, onPage }) {
  const { items, total, page = 1, limit = 10 } = data;
  const totalPages = Math.ceil(total / (limit || 10));

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-accent-600 rounded-full animate-spin"></div>
            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-accent-600" />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Compiling Dataset</h3>
            <p className="text-slate-400 text-xs font-bold mt-1">Fetching records from global operations...</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="py-32 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-10">
          <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6">
            <Inbox className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">No Active Records</h3>
          <p className="text-slate-500 font-medium max-w-sm">
            Your support stream is currently empty. Initialize a new request to begin synchronization.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((t, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={t._id}
              >
                <TicketItem ticket={t} />
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-8 border-t border-slate-100">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Page <span className="text-slate-900">{page || 1}</span> of <span className="text-slate-900">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPage(Math.max(1, (page || 1) - 1))}
                  disabled={page <= 1}
                  className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onPage(Math.min(totalPages, (page || 1) + 1))}
                  disabled={page >= totalPages}
                  className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

