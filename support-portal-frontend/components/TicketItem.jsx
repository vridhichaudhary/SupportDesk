"use client";
import { Ticket as TicketIcon, Clock, CheckCircle2, AlertCircle, ChevronRight, User as UserIcon, Calendar } from "lucide-react";

export default function TicketItem({ ticket }) {
  const isResolved = ticket.status === "resolved";
  const isInProgress = ticket.status === "in-progress";

  return (
    <div className="group bg-white rounded-2xl border border-stone-200 p-5 transition-all cursor-pointer shadow-sm hover:border-accent-400/50 hover:shadow-stone-200/50">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${isResolved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
            isInProgress ? 'bg-sky-50 text-sky-600 border-sky-100' :
              'bg-stone-50 text-stone-500 border-stone-200 group-hover:bg-accent-50 group-hover:text-accent-600 group-hover:border-accent-200'
            }`}>
            <TicketIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{ticket.ticketId}</span>
              <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border ${ticket.priority?.toLowerCase() === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                ticket.priority?.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  'bg-stone-50 text-stone-500 border-stone-200'
                }`}>
                {ticket.priority}
              </div>
            </div>
            <h4 className="text-base font-bold text-stone-900 group-hover:text-accent-600 transition-colors truncate leading-tight">{ticket.title}</h4>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-400">
                <div className="w-1 h-1 rounded-full bg-stone-300" />
                {ticket.category}
              </div>
              {ticket.user && (
                <div className="flex items-center gap-1.2 text-[11px] font-semibold text-stone-400">
                  <UserIcon className="w-3 h-3" />
                  {ticket.user.name}
                </div>
              )}
              <div className="flex items-center gap-1.2 text-[11px] font-semibold text-stone-400">
                <Calendar className="w-3 h-3" />
                {new Date(ticket.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto md:ml-0">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${isResolved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            isInProgress ? 'bg-sky-50 text-sky-700 border-sky-200' :
              'bg-stone-50 text-stone-700 border-stone-200'
            }`}>
            <span className="flex items-center gap-1.5">
              {isResolved ? <CheckCircle2 className="w-3 h-3" /> : isInProgress ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {ticket.status}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-900 transition-colors" />
        </div>
      </div>
    </div>
  );
}

