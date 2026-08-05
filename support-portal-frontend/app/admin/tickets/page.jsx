"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import axiosInstance from "@/utils/axiosInstance";
import Link from "next/link";
import ErrorCard from "@/components/ErrorCard";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
  TicketIcon,
  Plus,
  RefreshCw,
  SortAsc,
  SortDesc,
  ArrowUpRight,
} from "lucide-react";

// ─── Badge helpers ─────────────────────────────────────────────────────────

const STATUS_STYLES = {
  NEW: "bg-sky-50 text-sky-700 border-sky-100",
  OPEN: "bg-blue-50 text-blue-700 border-blue-100",
  ASSIGNED: "bg-violet-50 text-violet-700 border-violet-100",
  PENDING_CUSTOMER: "bg-amber-50 text-amber-700 border-amber-100",
  PENDING_INTERNAL: "bg-orange-50 text-orange-700 border-orange-100",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  CLOSED: "bg-stone-100 text-stone-600 border-stone-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-100",
};

const PRIORITY_STYLES = {
  CRITICAL: "bg-rose-50 text-rose-700 border-rose-100",
  HIGH: "bg-orange-50 text-orange-700 border-orange-100",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-100",
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

function StatusBadge({ status }) {
  const s = (status || "").toUpperCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLES[s] || "bg-stone-50 text-stone-600 border-stone-200"}`}>
      {s.replace("_", " ")}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = (priority || "").toUpperCase();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${PRIORITY_STYLES[p] || "bg-stone-50 text-stone-600 border-stone-200"}`}>
      {p}
    </span>
  );
}

// ─── Filter Bar ────────────────────────────────────────────────────────────

function FilterSelect({ value, onChange, options, icon: Icon }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none h-9 ${Icon ? "pl-9" : "pl-3"} pr-8 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:outline-none focus:ring-1 focus:ring-accent-600 focus:border-accent-600 transition-all cursor-pointer`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
    </div>
  );
}

// ─── Table Header Cell ─────────────────────────────────────────────────────

function Th({ children, sortKey, sortBy, sortDir, onSort, className = "" }) {
  const active = sortBy === sortKey;
  return (
    <th
      className={`px-4 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap ${sortKey ? "cursor-pointer select-none hover:text-stone-600" : ""} ${className}`}
      onClick={() => sortKey && onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortKey && (
          <span className={`transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}>
            {active && sortDir === "desc" ? (
              <SortDesc className="w-3 h-3" />
            ) : (
              <SortAsc className="w-3 h-3" />
            )}
          </span>
        )}
      </span>
    </th>
  );
}

// ─── Empty + Loading States ────────────────────────────────────────────────

function LoadingRows() {
  return Array.from({ length: 8 }).map((_, i) => (
    <tr key={i} className="border-b border-stone-50">
      {Array.from({ length: 8 }).map((_, j) => (
        <td key={j} className="px-4 py-3.5">
          <div className={`h-3 bg-stone-100 rounded animate-pulse ${j === 1 ? "w-40" : j === 0 ? "w-20" : "w-16"}`} />
        </td>
      ))}
    </tr>
  ));
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AdminTicketsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const LIMIT = 20;

  const searchTimeout = useRef(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { skip: (page - 1) * LIMIT, limit: LIMIT };
      if (search.trim()) params.q = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;

      const res = await axiosInstance.get("/tickets", { params });
      const data = res.data?.data ?? res.data;
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  function handleSearchChange(val) {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  }

  function handleSort(key) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  const displayItems = [...items].sort((a, b) => {
    let va = a[sortBy] ?? "";
    let vb = b[sortBy] ?? "";
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Tickets</h1>
          <p className="text-xs text-stone-400 font-medium mt-0.5">
            {total > 0 ? `${total.toLocaleString()} total` : "No tickets yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTickets}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button className="flex items-center gap-2 h-9 px-4 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-sm group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 group-focus-within:text-accent-600 transition-colors" />
          <input
            type="text"
            placeholder="Search by subject, ticket #, customer…"
            defaultValue={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-4 bg-white border border-stone-200 rounded-lg text-sm font-medium text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-accent-600 focus:border-accent-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <FilterSelect
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            icon={Filter}
            options={[
              { value: "all", label: "All Status" },
              { value: "NEW", label: "New" },
              { value: "OPEN", label: "Open" },
              { value: "ASSIGNED", label: "Assigned" },
              { value: "PENDING_CUSTOMER", label: "Pending Customer" },
              { value: "PENDING_INTERNAL", label: "Pending Internal" },
              { value: "RESOLVED", label: "Resolved" },
              { value: "CLOSED", label: "Closed" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
          />
          <FilterSelect
            value={priorityFilter}
            onChange={(v) => { setPriorityFilter(v); setPage(1); }}
            options={[
              { value: "all", label: "All Priorities" },
              { value: "CRITICAL", label: "Critical" },
              { value: "HIGH", label: "High" },
              { value: "MEDIUM", label: "Medium" },
              { value: "LOW", label: "Low" },
            ]}
          />
        </div>
      </div>

      {/* Status Quick Filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { value: "all", label: "All" },
          { value: "NEW", label: "New" },
          { value: "OPEN", label: "Open" },
          { value: "ASSIGNED", label: "Assigned" },
          { value: "PENDING_CUSTOMER", label: "Pending" },
          { value: "RESOLVED", label: "Resolved" },
          { value: "CLOSED", label: "Closed" },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => { setStatusFilter(s.value); setPage(1); }}
            className={`h-7 px-3 rounded-full text-[11px] font-bold transition-all ${
              statusFilter === s.value
                ? "bg-stone-900 text-white"
                : "bg-white border border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Error */}
      <div className="mb-4">
        <ErrorCard error={error} onRetry={fetchTickets} />
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="border-b border-stone-100 bg-stone-50/50">
              <tr className="group">
                <Th sortKey="ticket_number" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>#</Th>
                <Th sortKey="subject" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="min-w-[240px]">Subject</Th>
                <Th>Customer</Th>
                <Th sortKey="priority" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Priority</Th>
                <Th sortKey="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Status</Th>
                <Th>Agent</Th>
                <Th>Team</Th>
                <Th sortKey="updated_at" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Updated</Th>
                <Th className="w-8"></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loading ? (
                <LoadingRows />
              ) : displayItems.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-center mb-3">
                        <Inbox className="w-5 h-5 text-stone-300" />
                      </div>
                      <p className="text-sm font-bold text-stone-900 mb-1">No tickets found</p>
                      <p className="text-xs text-stone-400 font-medium">Try adjusting your filters or search query</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayItems.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-stone-100 flex items-center justify-between bg-stone-50/50">
            <span className="text-[11px] font-semibold text-stone-400">
              Showing <span className="text-stone-700">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)}</span> of{" "}
              <span className="text-stone-700">{total}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 w-7 flex items-center justify-center bg-white border border-stone-200 rounded text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`h-7 w-7 flex items-center justify-center rounded text-xs font-bold transition-all ${
                      page === pg
                        ? "bg-stone-900 text-white"
                        : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 w-7 flex items-center justify-center bg-white border border-stone-200 rounded text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Table Row ─────────────────────────────────────────────────────────────

function TicketRow({ ticket }) {
  const updatedAt = ticket.updated_at
    ? new Date(ticket.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";

  const customerName = ticket.customer?.name || ticket.customer?.email || "—";
  const agentName = ticket.assigned_user?.first_name
    ? `${ticket.assigned_user.first_name} ${ticket.assigned_user.last_name || ""}`.trim()
    : "—";
  const teamName = ticket.assigned_team?.name || "—";

  return (
    <tr className="group hover:bg-stone-50/60 transition-colors cursor-pointer">
      <td className="px-4 py-3.5">
        <span className="text-[11px] font-bold text-stone-400 font-mono">{ticket.ticket_number || "—"}</span>
      </td>
      <td className="px-4 py-3.5 max-w-xs">
        <div className="font-semibold text-stone-900 text-sm truncate group-hover:text-accent-600 transition-colors">
          {ticket.subject}
        </div>
        {ticket.category && (
          <div className="text-[10px] text-stone-400 font-medium mt-0.5 uppercase tracking-wider">
            {ticket.category}
          </div>
        )}
      </td>
      <td className="px-4 py-3.5">
        <span className="text-sm font-medium text-stone-700 truncate max-w-[120px] block">{customerName}</span>
      </td>
      <td className="px-4 py-3.5">
        <PriorityBadge priority={ticket.priority} />
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={ticket.status} />
      </td>
      <td className="px-4 py-3.5">
        {agentName !== "—" ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-stone-900 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
              {agentName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-stone-700 truncate max-w-[80px]">{agentName}</span>
          </div>
        ) : (
          <span className="text-xs text-stone-300 font-medium">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <span className="text-xs font-medium text-stone-500">{teamName}</span>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-xs text-stone-400 font-medium">{updatedAt}</span>
      </td>
      <td className="px-4 py-3.5">
        <Link
          href={`/admin/tickets/${ticket.id}`}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-stone-400 hover:text-accent-600 rounded"
          title="Open ticket"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </td>
    </tr>
  );
}
