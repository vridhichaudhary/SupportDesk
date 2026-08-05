"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, Loader2, ArrowLeft, Clock, MessageSquare, CheckCircle, Paperclip } from "lucide-react";
import Link from "next/link";
import axiosInstance from "@/utils/axiosInstance";
import PortalGuard from "@/components/portal/PortalGuard";

export default function PortalTicketDetailPage({ params }) {
  const unwrappedParams = use(params);
  const ticketId = unwrappedParams.id;
  
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
    
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const res = await axiosInstance.get(`/tickets/${ticketId}`);
      if (res.data?.data) {
        setTicket(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;

    setReplying(true);
    try {
      await axiosInstance.post(`/tickets/${ticketId}/reply`, {
        body: replyBody,
        is_internal: false
      });
      setReplyBody("");
      fetchTicket();
    } catch (err) {
      console.error(err);
      alert("Failed to send reply");
    } finally {
      setReplying(false);
    }
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

  if (loading) {
    return (
      <PortalGuard>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
        </div>
      </PortalGuard>
    );
  }

  if (!ticket) {
    return (
      <PortalGuard>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket not found</h2>
          <p className="text-gray-500 mb-6">The ticket you are looking for does not exist or you don't have access to it.</p>
          <Link href="/portal/tickets" className="text-sky-600 hover:underline">
            &larr; Back to my tickets
          </Link>
        </div>
      </PortalGuard>
    );
  }

  const isResolved = ["RESOLVED", "CLOSED"].includes(ticket.status);

  return (
    <PortalGuard>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <Link href="/portal/tickets" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-sky-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to tickets
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-gray-500">{ticket.ticket_number}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{ticket.subject}</h1>
            </div>
            
            <div className="flex flex-col gap-2 text-sm text-gray-500 bg-white p-4 rounded-xl border border-gray-100 shadow-sm min-w-[200px]">
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="font-medium text-gray-900">{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="font-medium text-gray-900">{ticket.category}</span>
              </div>
              <div className="flex justify-between">
                <span>Priority:</span>
                <span className="font-medium text-gray-900">{ticket.priority}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Original Ticket Body */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <div className="font-medium text-gray-900">You</div>
              <div className="text-xs text-gray-500">{new Date(ticket.created_at).toLocaleString()}</div>
            </div>
          </div>
          <div className="prose prose-sm sm:prose max-w-none text-gray-800 whitespace-pre-wrap">
            {ticket.body}
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="space-y-6 mb-8">
          {ticket.threads?.filter(t => t.thread_type === "CUSTOMER_REPLY" || t.thread_type === "AGENT_REPLY").map((thread, idx) => {
            const isCustomer = thread.thread_type === "CUSTOMER_REPLY";
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={thread.id} 
                className={`flex gap-4 ${isCustomer ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${
                  isCustomer ? "bg-sky-100 text-sky-700" : "bg-indigo-100 text-indigo-700"
                }`}>
                  {isCustomer ? (user?.first_name?.[0] || "U") : (thread.created_by?.first_name?.[0] || "S")}
                </div>
                
                <div className={`flex flex-col max-w-[85%] ${isCustomer ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-sm font-medium text-gray-900">
                      {isCustomer ? "You" : (thread.created_by?.display_name || "Support Team")}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(thread.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className={`p-4 rounded-2xl ${
                    isCustomer 
                      ? "bg-sky-600 text-white rounded-tr-none" 
                      : "bg-white border border-gray-200 text-gray-800 shadow-sm rounded-tl-none"
                  }`}>
                    <div className="whitespace-pre-wrap text-sm">{thread.body}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Reply Box */}
        {!isResolved ? (
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <form onSubmit={handleReply}>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={4}
                placeholder="Type your reply here..."
                className="w-full resize-none p-3 border-0 focus:ring-0 text-gray-800 placeholder-gray-400 outline-none"
                disabled={replying}
              />
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                <button type="button" className="p-2 text-gray-400 hover:text-sky-600 transition-colors rounded-lg hover:bg-sky-50">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={replying || !replyBody.trim()}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Reply
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">This ticket is resolved</h3>
            <p className="text-gray-600 mb-4">If you're still experiencing issues, you can create a new request.</p>
            
            {/* Optional CSAT could go here */}
            
            <Link
              href="/portal/tickets/new"
              className="inline-flex items-center text-sm font-medium text-emerald-700 bg-white border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Submit New Request
            </Link>
          </div>
        )}
      </div>
    </PortalGuard>
  );
}
