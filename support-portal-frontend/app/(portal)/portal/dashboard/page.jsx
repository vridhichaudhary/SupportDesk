"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Ticket, Clock, CheckCircle2, MessageCircle, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import axiosInstance from "@/utils/axiosInstance";
import PortalGuard from "@/components/portal/PortalGuard";

export default function PortalDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ open: 0, pending: 0, resolved: 0 });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axiosInstance.get("/tickets?limit=5");
        const items = res.data?.items || res.data?.data?.items || [];
        setTickets(items);
        
        let open = 0, pending = 0, resolved = 0;
        items.forEach(t => {
          if (["NEW", "OPEN", "ASSIGNED"].includes(t.status)) open++;
          else if (["PENDING_CUSTOMER", "PENDING_INTERNAL"].includes(t.status)) pending++;
          else if (["RESOLVED", "CLOSED"].includes(t.status)) resolved++;
        });
        
        setStats({ open, pending, resolved });
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboard();
  }, []);

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
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Overview of your support requests.</p>
          </div>
          <Link
            href="/portal/tickets/new"
            className="inline-flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            Submit New Request
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 font-medium">Open Tickets</h3>
              <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.open}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 font-medium">Pending Action</h3>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-500 font-medium">Resolved</h3>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.resolved}</p>
          </motion.div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <Link href="/portal/tickets" className="text-sm font-medium text-sky-600 hover:text-sky-700 flex items-center">
              View All <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="px-6 py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Ticket className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-medium">No tickets found</h3>
                <p className="text-gray-500 text-sm mt-1 mb-4">You haven't submitted any support requests yet.</p>
                <Link
                  href="/portal/tickets/new"
                  className="inline-flex text-sm font-medium text-sky-600 hover:text-sky-700"
                >
                  Create your first ticket &rarr;
                </Link>
              </div>
            ) : (
              tickets.map((ticket, i) => (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  key={ticket.id}
                >
                  <Link 
                    href={`/portal/tickets/${ticket.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-medium text-gray-500">{ticket.ticket_number}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                            {getStatusText(ticket.status)}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 truncate pr-4">{ticket.subject}</h3>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-4">
                          <span>Created {new Date(ticket.created_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5" /> Reply
                          </span>
                        </p>
                      </div>
                      <div className="text-gray-400">
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
