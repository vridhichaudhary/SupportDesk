"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/utils/axiosInstance";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Send,
  Lock,
  MessageSquare,
  User,
  Clock,
  Tag,
  AlertCircle,
  Building2,
  Calendar,
  RefreshCw,
  MoreHorizontal,
  Paperclip,
  CheckCircle2,
  XCircle,
  Activity,
  UserPlus,
  Sparkles,
} from "lucide-react";

// ─── Badges ────────────────────────────────────────────────────────────────

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
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLES[s] || "bg-stone-50 text-stone-600 border-stone-200"}`}>
      {s.replace(/_/g, " ")}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = (priority || "").toUpperCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${PRIORITY_STYLES[p] || "bg-stone-50 text-stone-600 border-stone-200"}`}>
      {p}
    </span>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
      {children}
    </div>
  );
}

// ─── Thread Message ────────────────────────────────────────────────────────

function ThreadMessage({ msg }) {
  const type = (msg.thread_type || "").toUpperCase();
  const isCustomer = type === "CUSTOMER_REPLY";
  const isInternal = type === "INTERNAL_NOTE";
  const isAgent = type === "AGENT_REPLY";

  const time = msg.created_at
    ? new Date(msg.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const senderName = msg.sender_user
    ? `${msg.sender_user.first_name || ""} ${msg.sender_user.last_name || ""}`.trim()
    : msg.sender_customer?.name || msg.sender_customer?.email || "Customer";

  if (isInternal) {
    return (
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
          <Lock className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-bold text-stone-700">{senderName}</span>
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">Internal Note</span>
            <span className="text-[10px] text-stone-400 ml-auto">{time}</span>
          </div>
          <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3 text-sm text-stone-700 leading-relaxed font-medium whitespace-pre-wrap">
            {msg.body}
          </div>
        </div>
      </div>
    );
  }

  if (isCustomer) {
    return (
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded bg-accent-50 border border-accent-100 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-accent-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-bold text-stone-700">{senderName}</span>
            <span className="text-[10px] text-stone-400 font-medium">Customer</span>
            <span className="text-[10px] text-stone-400 ml-auto">{time}</span>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-3 text-sm text-stone-700 leading-relaxed font-medium whitespace-pre-wrap shadow-sm">
            {msg.body}
          </div>
        </div>
      </div>
    );
  }

  // Agent reply
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded bg-stone-900 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-white">{senderName.charAt(0).toUpperCase()}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-bold text-stone-700">{senderName}</span>
          <span className="text-[10px] text-stone-400 font-medium">Agent</span>
          <span className="text-[10px] text-stone-400 ml-auto">{time}</span>
        </div>
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm text-stone-700 leading-relaxed font-medium whitespace-pre-wrap">
          {msg.body}
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Event ────────────────────────────────────────────────────────

function TimelineEvent({ event }) {
  const time = event.created_at
    ? new Date(event.created_at).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-stone-300 mt-1.5 shrink-0" />
      <div className="flex-1">
        <p className="text-[11px] text-stone-600 font-medium leading-snug">{event.description}</p>
        <p className="text-[10px] text-stone-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

// ─── Status Picker ─────────────────────────────────────────────────────────

const STATUSES = ["NEW", "OPEN", "ASSIGNED", "PENDING_CUSTOMER", "PENDING_INTERNAL", "RESOLVED", "CLOSED", "CANCELLED"];

function StatusPicker({ current, ticketId, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function updateStatus(status) {
    try {
      setLoading(true);
      await axiosInstance.post(`/tickets/${ticketId}/status`, { status });
      setOpen(false);
      onUpdated?.();
    } catch (err) {
      alert("Failed to update status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
        Change Status
        <ChevronDown className="w-3 h-3 ml-auto text-stone-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-10 overflow-hidden">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors ${
                s === current?.toUpperCase()
                  ? "bg-stone-50 text-stone-900 cursor-default"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar Metadata Row ──────────────────────────────────────────────────

function MetaRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-stone-50 last:border-0">
      <Icon className="w-3.5 h-3.5 text-stone-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{label}</div>
        <div className="text-xs font-semibold text-stone-900 mt-0.5 truncate">{value || "—"}</div>
      </div>
    </div>
  );
}

// ─── Main Detail Page ──────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [ticket, setTicket] = useState(null);
  const [thread, setThread] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [replyBody, setReplyBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  // ── AI Copilot State ──
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotDraft, setCopilotDraft] = useState(null);
  const [copilotError, setCopilotError] = useState(null);
  const [showCitations, setShowCitations] = useState(false);

  const threadEndRef = useRef(null);

  async function fetchTicket() {
    setLoading(true);
    setError(null);
    try {
      const [ticketRes, threadRes] = await Promise.all([
        axiosInstance.get(`/tickets/${id}`),
        axiosInstance.get(`/tickets/${id}/thread?include_internal=true`),
      ]);
      const tData = ticketRes.data?.data ?? ticketRes.data;
      setTicket(tData);
      const thData = threadRes.data?.data ?? threadRes.data;
      setThread(Array.isArray(thData) ? thData : []);
    } catch (err) {
      setError("Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchTicket();
  }, [id]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  async function handleGenerateDraft() {
    setCopilotLoading(true);
    setCopilotError(null);
    try {
      const res = await axiosInstance.post(`/tickets/${id}/copilot-draft`);
      const data = res.data?.data ?? res.data;
      setCopilotDraft(data);
      setShowCitations(false);
    } catch (err) {
      setCopilotError(
        err.response?.data?.detail || "Failed to generate AI Copilot draft. Please try again."
      );
    } finally {
      setCopilotLoading(false);
    }
  }

  async function handleInsertDraft() {
    if (!copilotDraft) return;
    setReplyBody(copilotDraft.draft_reply);
    setIsInternal(false);
    try {
      await axiosInstance.post(`/tickets/${id}/copilot-draft/${copilotDraft.suggestion_id}/action`, {
        action: "accept",
      });
    } catch (err) {
      console.error("Failed to log copilot accept action", err);
    }
  }

  async function handleDiscardDraft() {
    if (!copilotDraft) return;
    const sId = copilotDraft.suggestion_id;
    setCopilotDraft(null);
    setCopilotError(null);
    try {
      await axiosInstance.post(`/tickets/${id}/copilot-draft/${sId}/action`, {
        action: "reject",
      });
    } catch (err) {
      console.error("Failed to log copilot reject action", err);
    }
  }

  async function handleSendReply(e) {
    e.preventDefault();
    if (!replyBody.trim() || sending) return;
    try {
      setSending(true);
      await axiosInstance.post(`/tickets/${id}/reply`, {
        body: replyBody.trim(),
        is_internal: isInternal,
      });

      // Audit edit if draft was modified before sending
      if (copilotDraft && replyBody.trim() !== copilotDraft.draft_reply) {
        try {
          await axiosInstance.post(
            `/tickets/${id}/copilot-draft/${copilotDraft.suggestion_id}/action`,
            {
              action: "edit",
              edited_reply: replyBody.trim(),
            }
          );
        } catch (err) {
          console.error("Failed to log copilot edit action", err);
        }
      }

      setReplyBody("");
      setCopilotDraft(null);
      await fetchTicket();
    } catch (err) {
      alert("Failed to send reply.");
    } finally {
      setSending(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-20 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-stone-300 animate-spin" />
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Loading ticket…</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-7xl mx-auto py-20 flex flex-col items-center gap-4">
        <XCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm font-bold text-stone-900">{error || "Ticket not found."}</p>
        <button onClick={() => router.back()} className="text-xs text-accent-600 font-bold hover:underline">
          ← Go back
        </button>
      </div>
    );
  }

  const agentName = ticket.assigned_user
    ? `${ticket.assigned_user.first_name || ""} ${ticket.assigned_user.last_name || ""}`.trim()
    : null;
  const customerName = ticket.customer?.name || ticket.customer?.email || "Unknown customer";
  const customerEmail = ticket.customer?.email || "";
  const createdAt = ticket.created_at
    ? new Date(ticket.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
  const updatedAt = ticket.updated_at
    ? new Date(ticket.updated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-0.5 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-stone-400 font-mono">{ticket.ticket_number}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight leading-snug">
            {ticket.subject}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchTicket}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex gap-5 items-start">
        {/* ── Left: Conversation ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Thread */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-widest">
                  Conversation
                </span>
                <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
                  {thread.length}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-5 max-h-[480px] overflow-y-auto">
              {thread.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-xs text-stone-400 font-medium">No messages yet in this thread.</p>
                </div>
              ) : (
                thread.map((msg) => (
                  <ThreadMessage key={msg.id} msg={msg} />
                ))
              )}
              <div ref={threadEndRef} />
            </div>
          </div>

          {/* Reply Box */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsInternal(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold transition-colors ${
                    !isInternal ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-50"
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => setIsInternal(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold transition-colors ${
                    isInternal ? "bg-amber-500 text-white" : "text-stone-500 hover:bg-stone-50"
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  Internal Note
                </button>
              </div>

              {/* AI Copilot Draft Button */}
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={copilotLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {copilotLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>{copilotLoading ? "Searching & Drafting…" : "Draft with AI Copilot"}</span>
              </button>
            </div>

            {/* AI Copilot Loading Banner */}
            {copilotLoading && (
              <div className="p-4 border-b border-indigo-100 bg-indigo-50/40 flex items-center gap-3 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-indigo-900">
                    AI Copilot is retrieving published knowledge base articles & documents…
                  </p>
                  <p className="text-[11px] text-indigo-600">
                    Formulating grounded response with verified citations.
                  </p>
                </div>
              </div>
            )}

            {/* AI Copilot Error Banner */}
            {copilotError && (
              <div className="p-4 border-b border-rose-200 bg-rose-50 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-800 font-medium">{copilotError}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleGenerateDraft}
                    className="text-[11px] font-bold text-rose-700 hover:underline"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopilotError(null)}
                    className="text-stone-400 hover:text-stone-600"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* AI Copilot Draft Card */}
            {copilotDraft && (
              <div className="border-b border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-stone-900">AI Copilot Suggested Draft</span>
                    {copilotDraft.evidence_found ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        {copilotDraft.retrieval_match_score ?? copilotDraft.confidence_score}% Retrieval Match
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3 h-3" />
                        Escalation Recommended
                      </span>
                    )}
                    <span className="text-[10px] text-stone-400 font-mono">
                      {copilotDraft.model_name} • {copilotDraft.latency_ms}ms
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleGenerateDraft}
                      disabled={copilotLoading}
                      title="Regenerate Draft"
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-white rounded border border-transparent hover:border-stone-200 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      title="Discard Draft"
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-100 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Draft Body */}
                <div className="p-3.5 rounded-lg bg-white border border-indigo-100 text-xs text-stone-800 leading-relaxed font-normal whitespace-pre-wrap shadow-xs mb-3">
                  {copilotDraft.draft_reply}
                </div>

                {/* Citations Drawer */}
                {copilotDraft.citations && copilotDraft.citations.length > 0 && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setShowCitations(!showCitations)}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 transition-colors"
                    >
                      <span>
                        {showCitations ? "Hide" : "View"} Supporting Citations ({copilotDraft.citations.length})
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${showCitations ? "rotate-180" : ""}`}
                      />
                    </button>

                    {showCitations && (
                      <div className="mt-2 space-y-1.5">
                        {copilotDraft.citations.map((c) => (
                          <div
                            key={c.ref_id}
                            className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-white border border-stone-200 text-[11px]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                [{c.ref_id}]
                              </span>
                              <span className="font-semibold text-stone-800 truncate">{c.title}</span>
                              <span className="text-[10px] uppercase font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
                                {c.source_type}
                              </span>
                            </div>
                            {c.similarity > 0 && (
                              <span className="text-[10px] text-stone-400 font-mono shrink-0">
                                {Math.round(c.similarity * 100)}% match
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Row */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-indigo-100/60">
                  <p className="text-[10px] text-stone-400">
                    Draft is grounded in organization knowledge. Must be reviewed before sending.
                  </p>
                  <button
                    type="button"
                    onClick={handleInsertDraft}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Insert into Reply Box
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleSendReply}>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={
                  isInternal
                    ? "Write an internal note (only visible to agents)…"
                    : "Write a reply to the customer…"
                }
                rows={4}
                className={`w-full px-5 py-4 text-sm text-stone-700 font-medium resize-none focus:outline-none placeholder:text-stone-300 border-none ${
                  isInternal ? "bg-amber-50/40" : "bg-white"
                }`}
              />
              <div className={`px-5 py-3 border-t flex items-center justify-between ${isInternal ? "border-amber-100 bg-amber-50/40" : "border-stone-100"}`}>
                <div className="flex items-center gap-2">
                  <button type="button" className="p-1.5 text-stone-400 hover:text-stone-600 rounded transition-colors">
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!replyBody.trim() || sending}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    isInternal
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-stone-900 text-white hover:bg-stone-800"
                  }`}
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {isInternal ? "Add Note" : "Send Reply"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="w-72 shrink-0 space-y-3">
          {/* Status Actions */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
            <SectionLabel>Actions</SectionLabel>
            <div className="space-y-2">
              <StatusPicker current={ticket.status} ticketId={ticket.id} onUpdated={fetchTicket} />
              <button className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors">
                <UserPlus className="w-3.5 h-3.5" />
                {agentName ? "Reassign Agent" : "Assign Agent"}
              </button>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
            <SectionLabel>Customer</SectionLabel>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent-50 border border-accent-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-accent-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-900 truncate">{customerName}</div>
                {customerEmail && (
                  <div className="text-[10px] text-stone-400 truncate">{customerEmail}</div>
                )}
              </div>
            </div>
          </div>

          {/* Ticket Details */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
            <SectionLabel>Details</SectionLabel>
            <div className="space-y-0">
              <MetaRow icon={AlertCircle} label="Priority" value={ticket.priority} />
              <MetaRow icon={Tag} label="Category" value={ticket.category} />
              <MetaRow icon={Activity} label="Source" value={ticket.source} />
              <MetaRow
                icon={User}
                label="Assigned Agent"
                value={agentName || "Unassigned"}
              />
              <MetaRow
                icon={Building2}
                label="Team"
                value={ticket.assigned_team?.name || "—"}
              />
              <MetaRow icon={Calendar} label="Created" value={createdAt} />
              <MetaRow icon={Clock} label="Updated" value={updatedAt} />
              {ticket.resolved_at && (
                <MetaRow
                  icon={CheckCircle2}
                  label="Resolved"
                  value={new Date(ticket.resolved_at).toLocaleString("en-US", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                />
              )}
            </div>
          </div>

          {/* Organization */}
          {ticket.organization && (
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <SectionLabel>Organization</SectionLabel>
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-xs font-bold text-stone-700">{ticket.organization.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
