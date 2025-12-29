"use client";
import { X, Calendar, User as UserIcon, Tag, AlertCircle, Clock, CheckCircle2, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TicketDetailModal({ ticket, isOpen, onClose }) {
    if (!ticket) return null;

    const isResolved = ticket.status === "resolved";
    const isInProgress = ticket.status === "in-progress";

    const priorityColors = {
        high: "bg-rose-50 text-rose-700 border-rose-100",
        medium: "bg-amber-50 text-amber-700 border-amber-100",
        low: "bg-emerald-50 text-emerald-700 border-emerald-100",
    };

    const statusColors = {
        open: "bg-sky-50 text-sky-700 border-sky-100",
        "in-progress": "bg-amber-50 text-amber-700 border-amber-100",
        resolved: "bg-emerald-50 text-emerald-700 border-emerald-100",
        closed: "bg-stone-100 text-stone-700 border-stone-200",
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative bg-white w-full max-w-2xl rounded-[28px] shadow-2xl overflow-hidden border border-stone-200"
                    >
                        {/* Header */}
                        <div className="bg-stone-50 border-b border-stone-200 px-8 py-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-stone-400 tracking-tighter uppercase">{ticket.ticketId}</span>
                                <div className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${statusColors[ticket.status?.toLowerCase()]}`}>
                                    {ticket.status}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-stone-200/50 rounded-full transition-colors text-stone-400 hover:text-stone-900"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 max-h-[70vh] overflow-y-auto">
                            <h2 className="text-3xl font-bold text-stone-900 mb-6 leading-tight">{ticket.title}</h2>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                                    <div className="flex items-center gap-2 text-stone-400 mb-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Priority</span>
                                    </div>
                                    <div className={`text-xs font-bold capitalize ${priorityColors[ticket.priority?.toLowerCase()]?.split(' ')[1]}`}>
                                        {ticket.priority}
                                    </div>
                                </div>
                                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                                    <div className="flex items-center gap-2 text-stone-400 mb-1">
                                        <Tag className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Category</span>
                                    </div>
                                    <div className="text-xs font-bold text-stone-900">{ticket.category}</div>
                                </div>
                                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                                    <div className="flex items-center gap-2 text-stone-400 mb-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Date</span>
                                    </div>
                                    <div className="text-xs font-bold text-stone-900">{new Date(ticket.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                                    <div className="flex items-center gap-2 text-stone-400 mb-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Status</span>
                                    </div>
                                    <div className="text-xs font-bold text-stone-900 capitalize">{ticket.status}</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-[0.2em] mb-3">Description</h3>
                                    <p className="text-stone-600 leading-relaxed font-medium whitespace-pre-wrap">
                                        {ticket.description || "No detailed description provided."}
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-stone-100">
                                    {ticket.assignedTo && (
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center">
                                                <Shield className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Assigned Agent</div>
                                                <div className="text-sm font-bold text-stone-900">{ticket.assignedTo.name}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="bg-stone-50 border-t border-stone-200 px-8 py-5 flex items-center justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-white border border-stone-200 rounded-xl text-stone-600 text-xs font-bold hover:bg-stone-50 transition-colors shadow-sm"
                            >
                                Close View
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
