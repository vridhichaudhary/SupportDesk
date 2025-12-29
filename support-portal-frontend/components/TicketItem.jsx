"use client";
import { Ticket as TicketIcon, Clock, CheckCircle2, AlertCircle, ChevronRight, User as UserIcon, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function TicketItem({ ticket }) {
  const isResolved = ticket.status === "resolved";
  const isInProgress = ticket.status === "in-progress";

  return (
    <motion.div
      whileHover={{ y: -4, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
      className="group bg-white rounded-3xl border border-slate-100 p-6 transition-all cursor-pointer shadow-sm hover:border-accent-200"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-colors ${isResolved ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' :
              isInProgress ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white' :
                'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
            }`}>
            <TicketIcon className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ticket.ticketId}</span>
              <div className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter border ${ticket.priority?.toLowerCase() === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                  ticket.priority?.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-slate-50 text-slate-600 border-slate-100'
                }`}>
                {ticket.priority}
              </div>
            </div>
            <h4 className="text-xl font-black text-slate-900 group-hover:text-accent-600 transition-colors truncate">{ticket.title}</h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                {ticket.category}
              </div>
              {ticket.user && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  <UserIcon className="w-3.5 h-3.5" />
                  {ticket.user.name}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto md:ml-0">
          <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${isResolved ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
              isInProgress ? 'bg-amber-50 text-amber-700 border-amber-100' :
                'bg-blue-50 text-blue-700 border-blue-100'
            }`}>
            <span className="flex items-center gap-1.5">
              {isResolved ? <CheckCircle2 className="w-3.5 h-3.5" /> : isInProgress ? <Clock className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {ticket.status}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all">
            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

