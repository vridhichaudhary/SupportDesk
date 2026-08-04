"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/utils/axiosInstance";
import {
  ArrowLeft,
  Save,
  Send,
  History,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Globe,
  Lock,
  Layers,
  Users,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Tag,
  FolderOpen,
  Info,
} from "lucide-react";

const STATUS_WORKFLOW = {
  DRAFT:     ["IN_REVIEW", "PUBLISHED"],
  IN_REVIEW: ["APPROVED", "REJECTED", "DRAFT"],
  APPROVED:  ["PUBLISHED", "DRAFT"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED:  ["DRAFT"],
  REJECTED:  ["DRAFT"],
};

const STATUS_CONFIG = {
  DRAFT:     { label: "Draft",      color: "bg-stone-100 text-stone-500 border-stone-200" },
  IN_REVIEW: { label: "In Review",  color: "bg-amber-50  text-amber-600  border-amber-200" },
  APPROVED:  { label: "Approved",   color: "bg-blue-50   text-blue-600   border-blue-200" },
  PUBLISHED: { label: "Published",  color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ARCHIVED:  { label: "Archived",   color: "bg-stone-100 text-stone-400 border-stone-200" },
  REJECTED:  { label: "Rejected",   color: "bg-red-50    text-red-600    border-red-200" },
};

const VISIBILITY_OPTIONS = [
  { value: "INTERNAL",     label: "Internal",     icon: Lock },
  { value: "PUBLIC",       label: "Public",       icon: Globe },
  { value: "PRIVATE_TEAM", label: "Team",         icon: Users },
  { value: "ORGANIZATION", label: "Organization", icon: Layers },
];

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function readingTime(content) {
  const words = (content || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function VersionSidebar({ articleId, versions, onRestore, loading }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
        <History className="w-4 h-4 text-stone-400" />
        <span className="text-sm font-bold text-stone-800">Version History</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-stone-300" />
        </div>
      ) : versions.length === 0 ? (
        <p className="text-xs text-stone-400 text-center py-8">No versions yet</p>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-stone-50">
          {versions.map((v) => (
            <div key={v.id} className="px-5 py-3 hover:bg-stone-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-900">v{v.version_number}</span>
                  {v.edit_reason && (
                    <span className="text-[10px] text-stone-400 truncate max-w-[120px]">{v.edit_reason}</span>
                  )}
                </div>
                <button
                  onClick={() => onRestore(v.version_number)}
                  className="text-[10px] text-accent-600 hover:underline"
                >
                  Restore
                </button>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5">
                {new Date(v.created_at).toLocaleString("en-US", {
                  month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KBArticleEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const isNew = id === "new";

  const [article, setArticle]       = useState(null);
  const [categories, setCategories] = useState([]);
  const [versions, setVersions]     = useState([]);
  const [loading, setLoading]       = useState(!isNew);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState(null);
  const [saved, setSaved]           = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Form state
  const [title,      setTitle]      = useState("");
  const [slug,       setSlug]       = useState("");
  const [summary,    setSummary]    = useState("");
  const [content,    setContent]    = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [visibility, setVisibility] = useState("INTERNAL");
  const [editReason, setEditReason] = useState("");
  const [slugManual, setSlugManual] = useState(false);

  useEffect(() => {
    axiosInstance.get("/knowledge/categories").then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    axiosInstance.get(`/knowledge/articles/${id}`)
      .then(({ data }) => {
        setArticle(data);
        setTitle(data.title || "");
        setSlug(data.slug || "");
        setSummary(data.summary || "");
        setContent(data.content || "");
        setCategoryId(data.category_id || "");
        setVisibility(data.visibility || "INTERNAL");
        setSlugManual(true);
      })
      .catch(() => setError("Article not found or access denied."))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  const loadVersions = useCallback(async () => {
    if (isNew) return;
    setVersionsLoading(true);
    try {
      const { data } = await axiosInstance.get(`/knowledge/articles/${id}/versions`);
      setVersions(data);
    } catch (_) {}
    finally { setVersionsLoading(false); }
  }, [id, isNew]);

  useEffect(() => {
    if (showVersions) loadVersions();
  }, [showVersions, loadVersions]);

  // Auto-slug from title
  useEffect(() => {
    if (!slugManual && title) setSlug(slugify(title));
  }, [title, slugManual]);

  const handleSave = async () => {
    if (!title || !slug || !content) {
      setError("Title, slug, and content are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { title, slug, summary, content, visibility, edit_reason: editReason || undefined };
      if (categoryId) payload.category_id = categoryId;

      if (isNew) {
        const { data } = await axiosInstance.post("/knowledge/articles", payload);
        setSaved(true);
        setTimeout(() => router.push(`/admin/knowledge/${data.id}`), 600);
      } else {
        await axiosInstance.put(`/knowledge/articles/${id}`, payload);
        setArticle((a) => ({ ...a, ...payload }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      setError(e?.response?.data?.error?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflow = async (newStatus) => {
    try {
      const { data } = await axiosInstance.post(`/knowledge/articles/${id}/workflow`, { status: newStatus });
      setArticle(data);
    } catch (e) {
      alert(e?.response?.data?.error?.message || "Workflow change failed.");
    }
  };

  const handleRestore = async (versionNumber) => {
    if (!window.confirm(`Restore to version ${versionNumber}?`)) return;
    try {
      const { data } = await axiosInstance.post(`/knowledge/articles/${id}/restore/${versionNumber}`);
      setTitle(data.title);
      setSlug(data.slug);
      setSummary(data.summary || "");
      setContent(data.content);
      setArticle(data);
      setShowVersions(false);
    } catch (e) {
      alert(e?.response?.data?.error?.message || "Restore failed.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-stone-300 animate-spin" />
      </div>
    );
  }

  if (error && !isNew && !article) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-stone-500">{error}</p>
        <button onClick={() => router.back()} className="text-xs text-accent-600 underline">Go back</button>
      </div>
    );
  }

  const currentStatus = article?.status || "DRAFT";
  const workflowOptions = STATUS_WORKFLOW[currentStatus] || [];
  const rt = readingTime(content);

  return (
    <div className="flex h-full bg-white">
      {/* Main Editor */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all ${showVersions ? "mr-72" : ""}`}>

        {/* Toolbar */}
        <div className="border-b border-stone-200 px-6 py-3.5 flex items-center gap-3 bg-white flex-wrap">
          <button
            onClick={() => router.push("/admin/knowledge")}
            className="p-1.5 rounded text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-stone-200" />

          {/* Status badge */}
          {!isNew && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${STATUS_CONFIG[currentStatus]?.color}`}>
              {STATUS_CONFIG[currentStatus]?.label}
            </span>
          )}

          {/* Workflow */}
          {!isNew && workflowOptions.length > 0 && (
            <div className="relative group">
              <button className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors">
                <Send className="w-3.5 h-3.5" />
                Change Status
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute left-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-30 hidden group-hover:block min-w-[140px]">
                {workflowOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleWorkflow(s)}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    → {STATUS_CONFIG[s]?.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!isNew && (
              <button
                onClick={() => setShowVersions((v) => !v)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  showVersions ? "bg-stone-900 text-white border-stone-900" : "border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                History
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Article metadata bar */}
        {!isNew && article && (
          <div className="border-b border-stone-50 bg-stone-50/40 px-8 py-2 flex items-center gap-6 text-[11px] text-stone-400">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {rt} min read</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(article.views || 0).toLocaleString()} views</span>
            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {article.helpful_count || 0}</span>
            <span className="flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> {article.not_helpful_count || 0}</span>
            <span className="ml-auto">v{article.version}</span>
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-8 py-8 max-w-4xl mx-auto w-full">
          {/* Title */}
          <textarea
            value={title}
            onChange={(e) => { setTitle(e.target.value); setSlugManual(false); }}
            placeholder="Article title…"
            rows={2}
            className="w-full text-2xl font-bold text-stone-900 placeholder:text-stone-300 bg-transparent border-none outline-none resize-none leading-snug"
          />

          {/* Slug */}
          <div className="flex items-center gap-2 mt-1 mb-6">
            <span className="text-xs text-stone-400">/knowledge/</span>
            <input
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
              placeholder="article-slug"
              className="text-xs text-stone-500 bg-transparent border-none outline-none focus:underline underline-offset-2 decoration-stone-300"
            />
          </div>

          {/* Summary */}
          <div className="mb-6">
            <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1 block">
              Summary / SEO Description
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="A short description of this article…"
              rows={2}
              className="w-full text-sm text-stone-700 placeholder:text-stone-300 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-stone-900 resize-none bg-white"
            />
          </div>

          {/* Content */}
          <div className="mb-6">
            <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1 block">
              Content (Markdown supported)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article content here…"
              rows={24}
              className="w-full text-sm font-mono text-stone-700 placeholder:text-stone-300 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-stone-900 resize-none bg-white leading-relaxed"
            />
            <p className="text-[10px] text-stone-400 mt-1">{rt} min read · {content.split(/\s+/).filter(Boolean).length} words</p>
          </div>

          {/* Edit Reason */}
          {!isNew && (
            <div className="mb-6">
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1 block">
                Edit Reason (optional, for version history)
              </label>
              <input
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Updated pricing section"
                className="w-full text-sm text-stone-700 placeholder:text-stone-300 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Metadata Sidebar */}
      <div className="w-64 flex-shrink-0 border-l border-stone-200 bg-stone-50/30 flex flex-col overflow-y-auto">
        <div className="px-5 py-4 border-b border-stone-100">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3">Properties</p>

          {/* Visibility */}
          <div className="mb-4">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 block">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-700"
            >
              {VISIBILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="mb-4">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 block">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-xs border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-700"
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Article info */}
        {!isNew && article && (
          <div className="px-5 py-4 space-y-3">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Article Info</p>
            <div className="space-y-2 text-[11px] text-stone-500">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="font-semibold text-stone-700">v{article.version}</span>
              </div>
              <div className="flex justify-between">
                <span>Views</span>
                <span className="font-semibold text-stone-700">{(article.views || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Helpful</span>
                <span className="font-semibold text-emerald-700">↑ {article.helpful_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Not helpful</span>
                <span className="font-semibold text-red-500">↓ {article.not_helpful_count || 0}</span>
              </div>
              {article.published_at && (
                <div className="flex justify-between">
                  <span>Published</span>
                  <span className="font-semibold text-stone-700">
                    {new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Version History Drawer */}
      {showVersions && (
        <div className="fixed right-0 top-0 bottom-0 w-72 bg-white border-l border-stone-200 shadow-xl z-40 flex flex-col">
          <VersionSidebar
            articleId={id}
            versions={versions}
            onRestore={handleRestore}
            loading={versionsLoading}
          />
        </div>
      )}
    </div>
  );
}
