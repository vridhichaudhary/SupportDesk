"use client";
import TicketItem from "./TicketItem";
import { Loader2, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { motion } from "framer-motion";

export default function TicketList({ loading, data = { items: [], total: 0 }, onPage }) {
  const { items, total, page = 1, limit = 10 } = data;
  const totalPages = Math.ceil(total / (limit || 10));

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-stone-100 border-t-accent-600 rounded-full animate-spin"></div>
            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-accent-600" />
          </div>
          <div className="text-center">
            <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Compiling Records</h3>
            <p className="text-stone-300 text-[9px] font-bold uppercase tracking-tight mt-0.5">Global Synchronization...</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="py-24 bg-stone-50 rounded-2xl border border-dashed border-stone-200 flex flex-col items-center justify-center text-center px-10">
          <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mb-5 border border-stone-100/50">
            <Inbox className="w-8 h-8 text-stone-200" />
          </div>
          <h3 className="text-xl font-bold text-stone-900 tracking-tight mb-1">No Active Records</h3>
          <p className="text-stone-400 text-sm font-medium max-w-sm">
            Your support stream is currently empty. Initialize a request to begin.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((t, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={t._id}
              >
                <TicketItem ticket={t} />
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-stone-100">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                Record <span className="text-stone-900">{(page - 1) * limit + 1}</span> - <span className="text-stone-900">{Math.min(page * limit, total)}</span> of <span className="text-stone-900">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPage(Math.max(1, (page || 1) - 1))}
                  disabled={page <= 1}
                  className="p-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 border-b-2 active:border-b-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPage(Math.min(totalPages, (page || 1) + 1))}
                  disabled={page >= totalPages}
                  className="p-2 bg-white border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 border-b-2 active:border-b-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

