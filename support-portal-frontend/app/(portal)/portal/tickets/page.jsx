"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Ticket, Search, Filter, MessageCircle, ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import axiosInstance from "@/utils/axiosInstance";
import PortalGuard from "@/components/portal/PortalGuard";

export default function PortalTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let url = "/tickets?limit=50";
      if (statusFilter !== "ALL") {
        url += `&status=${statusFilter}`;
      }
      if (search) {
        url += `&q=${encodeURIComponent(search)}`;
      }
      
      const res = await axiosInstance.get(url);
      setTickets(res.data?.items || res.data?.data?.items || []);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "NEW":
      case "OPEN":
      case "ASSIGNED":
        return "bg-sky-100 text-sky-700";
      case "PENDING_CUSTOMER":
      case "PENDING_INTERNAL":
        return "bg-amber-100 text-amber-700";
      case "RESOLVED":
      case "CLOSED":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusText = (status) => {
    return status.replace("_", " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <PortalGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <nav className="flex text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li><Link href="/portal/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link></li>
              <li><ChevronRight className="w-4 h-4" /></li>
              <li className="text-gray-900 font-medium" aria-current="page">My Tickets</li>
            </ol>
          </nav>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
              <p className="text-gray-500 mt-1">View and track all your support requests.</p>
            </div>
            <Link
              href="/portal/tickets/new"
              className="inline-flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
            >
              Submit New Request
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === "ALL" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              All Tickets
            </button>
            <button
              onClick={() => setStatusFilter("OPEN")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === "OPEN" ? "bg-sky-100 text-sky-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter("PENDING_CUSTOMER")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === "PENDING_CUSTOMER" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Awaiting Reply
            </button>
            <button
              onClick={() => setStatusFilter("RESOLVED")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === "RESOLVED" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Resolved
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm outline-none transition-all"
            />
          </form>
        </div>

        {/* Ticket List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="px-6 py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Ticket className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No tickets found</h3>
                <p className="text-gray-500 mb-6">You don't have any tickets matching the current criteria.</p>
                {statusFilter !== "ALL" || search !== "" ? (
                  <button 
                    onClick={() => { setStatusFilter("ALL"); setSearch(""); fetchTickets(); }}
                    className="text-sky-600 font-medium hover:text-sky-700"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <Link
                    href="/portal/tickets/new"
                    className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
                  >
                    Submit a Request
                  </Link>
                )}
              </div>
            ) : (
              tickets.map((ticket, i) => (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.05, 0.3) }}
                  key={ticket.id}
                >
                  <Link 
                    href={`/portal/tickets/${ticket.id}`}
                    className="block px-6 py-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-sm font-medium text-gray-500">{ticket.ticket_number}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                            {getStatusText(ticket.status)}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">{ticket.subject}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Updated {new Date(ticket.updated_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" /> Reply
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-400 mt-2">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </PortalGuard>
  );
}
