"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import axiosInstance from "@/utils/axiosInstance";
import ErrorCard from "@/components/ErrorCard";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Layers,
  Globe,
  Lock,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";

const STATUS_CONFIG = {
  DRAFT:     { label: "Draft",     color: "bg-stone-100 text-stone-500 border-stone-200" },
  IN_REVIEW: { label: "In Review", color: "bg-amber-50  text-amber-600  border-amber-200" },
  APPROVED:  { label: "Approved",  color: "bg-blue-50   text-blue-600   border-blue-200" },
  PUBLISHED: { label: "Published", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ARCHIVED:  { label: "Archived", color: "bg-stone-100 text-stone-400 border-stone-200" },
  REJECTED:  { label: "Rejected", color: "bg-red-50   text-red-600   border-red-200" },
};

const VISIBILITY_CONFIG = {
  INTERNAL:     { label: "Internal",     icon: Lock },
  PUBLIC:       { label: "Public",       icon: Globe },
  PRIVATE_TEAM: { label: "Team",         icon: Users },
  DEPARTMENT:   { label: "Department",   icon: Layers },
  ORGANIZATION: { label: "Organization", icon: Layers },
};

const SORT_OPTIONS = [
  { value: "updated_at", label: "Last Modified" },
  { value: "title",      label: "Title A–Z" },
  { value: "views",      label: "Most Viewed" },
  { value: "helpful_count", label: "Most Helpful" },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function VisibilityBadge({ visibility }) {
  const cfg = VISIBILITY_CONFIG[visibility] || VISIBILITY_CONFIG.INTERNAL;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function KnowledgePage() {
  const [articles, setArticles]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [sortBy, setSortBy]           = useState("updated_at");
  const [showFilters, setShowFilters] = useState(false);

  const PAGE_SIZE = 20;

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/knowledge/categories");
      setCategories(data);
    } catch (_) {}
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("size", PAGE_SIZE);
      params.set("sort_by", sortBy);
      if (search)         params.set("query", search);
      if (filterStatus)   params.set("status", filterStatus);
      if (filterCategoryId) params.set("category_id", filterCategoryId);

      const { data } = await axiosInstance.get(`/knowledge/articles?${params}`);
      setArticles(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterCategoryId, sortBy]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchArticles(); },  [fetchArticles]);

  const handleDelete = async (id) => {
    if (!window.confirm("Archive this article?")) return;
    try {
      await axiosInstance.delete(`/knowledge/articles/${id}`);
      fetchArticles();
    } catch (e) {
      alert(e?.response?.data?.error?.message || "Delete failed.");
    }
  };

  const handleWorkflow = async (id, newStatus) => {
    try {
      await axiosInstance.post(`/knowledge/articles/${id}/workflow`, { status: newStatus });
      fetchArticles();
    } catch (e) {
      alert(e?.response?.data?.error?.message || "Workflow change failed.");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-stone-400" />
          <div>
            <h1 className="text-base font-bold text-stone-900 tracking-tight">Knowledge Base</h1>
            <p className="text-xs text-stone-400 mt-0.5">{total} article{total !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
          <Link
            href="/admin/knowledge/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Article
          </Link>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="border-b border-stone-100 bg-stone-50/60 px-8 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-4 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 placeholder:text-stone-400"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-stone-400">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="text-xs border border-stone-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-700"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="text-xs border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-700"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>

            <select
              value={filterCategoryId}
              onChange={(e) => { setFilterCategoryId(e.target.value); setPage(1); }}
              className="text-xs border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-700"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {(filterStatus || filterCategoryId || search) && (
              <button
                onClick={() => { setFilterStatus(""); setFilterCategoryId(""); setSearch(""); setPage(1); }}
                className="text-xs text-stone-500 hover:text-stone-900 underline underline-offset-2 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-6 h-6 text-stone-300 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            {error && (
              <div className="mb-4">
                <ErrorCard error={error} onRetry={fetchArticles} />
              </div>
            )}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <FileText className="w-8 h-8 text-stone-300" />
            <p className="text-sm font-medium text-stone-400">No articles found</p>
            <Link href="/admin/knowledge/new" className="text-xs text-accent-600 hover:underline">
              Create the first article →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/40 text-left">
                <th className="px-8 py-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider">Visibility</th>
                <th className="px-4 py-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider">Views</th>
                <th className="px-4 py-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider">Updated</th>
                <th className="px-4 py-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr
                  key={article.id}
                  className="border-b border-stone-50 hover:bg-stone-50/60 transition-colors group"
                >
                  <td className="px-8 py-3.5">
                    <Link href={`/admin/knowledge/${article.id}`} className="font-semibold text-stone-900 hover:text-accent-700 transition-colors line-clamp-1">
                      {article.title}
                    </Link>
                    {article.summary && (
                      <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-1">{article.summary}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-stone-500">
                    {article.category?.name || <span className="text-stone-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={article.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <VisibilityBadge visibility={article.visibility} />
                  </td>
                  <td className="px-4 py-3.5 text-xs text-stone-500 tabular-nums">
                    {(article.views || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-stone-400">
                    {article.updated_at ? new Date(article.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {article.status === "DRAFT" && (
                        <button
                          onClick={() => handleWorkflow(article.id, "PUBLISHED")}
                          title="Publish"
                          className="p-1.5 rounded text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {article.status === "PUBLISHED" && (
                        <button
                          onClick={() => handleWorkflow(article.id, "ARCHIVED")}
                          title="Archive"
                          className="p-1.5 rounded text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Link
                        href={`/admin/knowledge/${article.id}`}
                        title="Edit"
                        className="p-1.5 rounded text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(article.id)}
                        title="Delete"
                        className="p-1.5 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-stone-100 px-8 py-3 flex items-center justify-between bg-white">
          <span className="text-xs text-stone-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  p === page ? "bg-stone-900 text-white" : "border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
