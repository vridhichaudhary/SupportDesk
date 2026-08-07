"use client";

import { useState, useEffect } from "react";
import {
  Brain, ChevronRight, Clock, CheckCircle2, AlertCircle,
  Zap, Users, Building2, Tag, ArrowRight, RefreshCw,
  Shield, TrendingUp, Loader2, Info, Activity
} from "lucide-react";
import api from "@/utils/axiosInstance";
import Link from "next/link";

const CATEGORY_COLORS = {
  BILLING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  TECHNICAL: "bg-blue-50 text-blue-700 border-blue-200",
  BUG_REPORT: "bg-red-50 text-red-700 border-red-200",
  FEATURE_REQUEST: "bg-purple-50 text-purple-700 border-purple-200",
  ACCOUNT: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SECURITY: "bg-rose-50 text-rose-700 border-rose-200",
  SALES: "bg-emerald-50 text-emerald-700 border-emerald-200",
  GENERAL: "bg-gray-50 text-gray-700 border-gray-200",
};

const PRIORITY_COLORS = {
  LOW: "bg-green-50 text-green-700",
  MEDIUM: "bg-yellow-50 text-yellow-700",
  HIGH: "bg-orange-50 text-orange-700",
  CRITICAL: "bg-red-50 text-red-600 font-bold",
};

function ConfidenceBadge({ score }) {
  const color =
    score >= 80 ? "bg-green-100 text-green-700" :
    score >= 50 ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-600";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <Activity size={11} />
      {score}% confidence
    </span>
  );
}

export default function RoutingDashboardPage() {
  const [decisions, setDecisions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await api.get("/routing/decisions?limit=30");
      const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setDecisions(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    } catch (e) {
      console.error("Failed to fetch routing decisions", e);
      setError("Could not load routing decisions. Check your permissions or try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Brain size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">AI Routing Dashboard</h1>
              <p className="text-xs text-gray-500">Recent intelligent routing decisions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/routing/rules"
              className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Zap size={14} />
              Automation Rules
            </Link>
            <button
              onClick={fetchDecisions}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 size={28} className="animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Loading routing decisions…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-stone-500">
          <Brain size={40} className="opacity-30" />
          <p className="text-sm font-semibold text-stone-700">Failed to load routing decisions</p>
          <p className="text-xs text-center max-w-sm text-stone-400">{error}</p>
          <button onClick={fetchDecisions} className="text-xs font-bold px-4 py-2 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-sm mt-2">
            Try Again
          </button>
        </div>
      ) : decisions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
          <Brain size={40} className="opacity-30" />
          <p className="text-sm font-medium">No routing decisions yet.</p>
          <p className="text-xs text-center max-w-sm">
            Create a ticket and the AI routing engine will analyze and assign it automatically.
          </p>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-120px)]">
          {/* List */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto">
            {decisions.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected?.id === d.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500">TICKET</span>
                  {d.confidence_score != null && <ConfidenceBadge score={d.confidence_score} />}
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{d.ticket_id.slice(0, 8)}…</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {d.predicted_category && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[d.predicted_category] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                      {d.predicted_category}
                    </span>
                  )}
                  {d.predicted_priority && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[d.predicted_priority] || "bg-gray-100 text-gray-600"}`}>
                      {d.predicted_priority}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{formatDate(d.created_at)}</p>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          {selected ? (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Classification */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Brain size={14} className="text-blue-500" />
                    AI Classification
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Category</p>
                      <span className={`text-sm font-semibold px-2.5 py-1 rounded border ${CATEGORY_COLORS[selected.predicted_category] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                        {selected.predicted_category || "—"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Priority</p>
                      <span className={`text-sm font-semibold px-2.5 py-1 rounded ${PRIORITY_COLORS[selected.predicted_priority] || "bg-gray-100 text-gray-700"}`}>
                        {selected.predicted_priority || "—"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Suggested SLA</p>
                      <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        <Clock size={13} className="text-gray-400" />
                        {selected.suggested_sla_hours != null ? `${selected.suggested_sla_hours}h` : "—"}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Model</p>
                      <span className="text-xs font-mono text-gray-600">{selected.model_version || "—"}</span>
                    </div>
                  </div>
                  {selected.suggested_tags_json?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1.5">Suggested Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.suggested_tags_json.map((tag) => (
                          <span key={tag} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                            <Tag size={10} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Explainability */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
                  <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Info size={14} className="text-blue-500" />
                    Explainability
                  </h2>
                  <div className="mb-3 flex items-center gap-2">
                    <ConfidenceBadge score={selected.confidence_score ?? 0} />
                    <span className="text-xs text-gray-500">
                      in {selected.execution_time_ms != null ? `${selected.execution_time_ms}ms` : "—"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {selected.reasoning || "No reasoning provided."}
                  </p>
                </div>

                {/* Assignment */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users size={14} className="text-blue-500" />
                    Assignment
                  </h2>
                  <div className="space-y-2">
                    {selected.assigned_agent_id && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Agent</span>
                        <span className="font-mono text-xs text-gray-700">{selected.assigned_agent_id.slice(0, 12)}…</span>
                      </div>
                    )}
                    {selected.assigned_team_id && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Team</span>
                        <span className="font-mono text-xs text-gray-700">{selected.assigned_team_id.slice(0, 12)}…</span>
                      </div>
                    )}
                    {selected.assigned_department_id && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Department</span>
                        <span className="font-mono text-xs text-gray-700">{selected.assigned_department_id.slice(0, 12)}…</span>
                      </div>
                    )}
                    {!selected.assigned_agent_id && !selected.assigned_team_id && (
                      <p className="text-sm text-gray-400 italic">No assignment was made.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p className="text-sm">Select a decision to inspect.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
