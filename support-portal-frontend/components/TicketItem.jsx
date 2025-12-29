"use client";
import { Search, Filter, ChevronDown, Trash2 } from "lucide-react";

export default function TicketItem({ ticket, onDelete }) {
  const priorityLower = (ticket.priority || "low").toLowerCase();
  const statusLower = (ticket.status || "open").toLowerCase();

  const priorityClasses =
    priorityLower === "high"
      ? "bg-rose-100 text-rose-700"
      : priorityLower === "medium"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";

  const statusClasses =
    statusLower === "open"
      ? "bg-sky-100 text-sky-700"
      : statusLower === "in-progress"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-4 shadow-sm hover:shadow-md hover:shadow-stone-200/50 transition-all group">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-stone-900 tracking-tight">{ticket.ticketId}</span>
        <div className="flex gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusClasses}`}>
            {ticket.status}
          </span>
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${priorityClasses}`}>
            {ticket.priority}
          </span>
        </div>
      </div>

      <div>
        <h4 className="text-xl font-bold text-stone-900 mb-1 leading-tight group-hover:text-accent-600 transition-colors">
          {ticket.title}
        </h4>
        <p className="text-xs font-semibold text-stone-400">
          Category: {ticket.category} • Created: {new Date(ticket.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="mt-2 text-left">
        <button
          onClick={() => onDelete && onDelete(ticket.id)}
          className="px-4 py-1.5 text-rose-600 border border-stone-200 rounded-lg text-xs font-bold hover:bg-rose-50 hover:border-rose-200 transition-colors flex items-center gap-2"
        >
          {/* <Trash2 className="w-3.5 h-3.5" /> */}
          Delete
        </button>
      </div>
    </div>
  );
}
