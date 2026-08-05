"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, FileText, Loader2, Search, Settings, 
  Trash2, RefreshCw, CheckCircle2, XCircle, Clock,
  FileDigit, FileJson, Hash
} from "lucide-react";
import { format } from "date-fns";

import api from "@/lib/api";

const statusConfig = {
  UPLOADED: { color: "bg-gray-100 text-gray-700", icon: Clock, label: "Uploaded" },
  QUEUED: { color: "bg-blue-50 text-blue-700", icon: Clock, label: "Queued" },
  PROCESSING: { color: "bg-purple-50 text-purple-700", icon: Loader2, label: "Processing" },
  COMPLETED: { color: "bg-green-50 text-green-700", icon: CheckCircle2, label: "Completed" },
  FAILED: { color: "bg-red-50 text-red-700", icon: XCircle, label: "Failed" },
  ARCHIVED: { color: "bg-gray-100 text-gray-500", icon: Trash2, label: "Archived" },
};

export default function DocumentDetails() {
  const { id } = useParams();
  const router = useRouter();
  
  const [doc, setDoc] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchDocument();
  }, [id, refreshTrigger]);
  
  // Auto-poll if processing
  useEffect(() => {
    if (doc && (doc.status === 'PROCESSING' || doc.status === 'QUEUED' || doc.status === 'UPLOADED')) {
      const interval = setInterval(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [doc]);

  useEffect(() => {
    if (doc?.status === 'COMPLETED') {
      fetchChunks();
    }
  }, [doc?.status, id]);

  const fetchDocument = async () => {
    try {
      const res = await api.get(`/documents/${id}`);
      setDoc(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        router.push('/admin/documents');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchChunks = async () => {
    setLoadingChunks(true);
    try {
      const res = await api.get(`/documents/${id}/chunks?limit=1000`);
      setChunks(res.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await api.delete(`/documents/${id}`);
      router.push('/admin/documents');
    } catch (err) {
      alert("Failed to delete document.");
    }
  };

  const handleRetry = async () => {
    try {
      await api.post(`/documents/${id}/retry`);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      alert("Failed to retry document.");
    }
  };

  const filteredChunks = chunks.filter(c => 
    c.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!doc) return null;

  const status = statusConfig[doc.status] || statusConfig.UPLOADED;
  const StatusIcon = status.icon;

  return (
    <div className="flex-1 overflow-auto bg-gray-50/50">
      <div className="max-w-[1400px] mx-auto p-8 space-y-6">
        
        {/* Back Link */}
        <Link 
          href="/admin/documents"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Documents
        </Link>

        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col lg:flex-row gap-6 justify-between items-start">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{doc.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${status.color}`}>
                  <StatusIcon className={`w-3.5 h-3.5 ${doc.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                  {status.label}
                </div>
                <span>•</span>
                <span className="uppercase">{doc.mime_type.split('/').pop()}</span>
                <span>•</span>
                <span>{formatBytes(doc.file_size)}</span>
                <span>•</span>
                <span>Added {format(new Date(doc.created_at), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {(doc.status === 'FAILED' || doc.status === 'UPLOADED') && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Processing
              </button>
            )}
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 text-sm font-medium border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete Document
            </button>
          </div>
        </div>

        {doc.error_message && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            <strong>Error Processing Document:</strong> {doc.error_message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content Area: Chunks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Hash className="w-5 h-5 text-gray-400" />
                Extracted Chunks
                {doc.status === 'COMPLETED' && <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{chunks.length}</span>}
              </h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chunks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={doc.status !== 'COMPLETED'}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            </div>

            {doc.status === 'QUEUED' || doc.status === 'PROCESSING' || doc.status === 'UPLOADED' ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-gray-900 font-medium mb-1">Processing Document</h3>
                <p className="text-sm text-gray-500">Extracting text and chunking content. This may take a moment...</p>
              </div>
            ) : loadingChunks ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
              </div>
            ) : chunks.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <FileDigit className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-900 font-medium mb-1">No Chunks Extracted</h3>
                <p className="text-sm text-gray-500">The document parser couldn't find any text to extract.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredChunks.map(chunk => (
                  <div key={chunk.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50/50 px-4 py-2 border-b border-gray-200 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-gray-700">Chunk {chunk.chunk_index}</span>
                        {chunk.page_number && <span>Page {chunk.page_number}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span>{chunk.word_count} words</span>
                        <span className="font-mono text-[10px] text-gray-400" title="Content Hash">
                          {chunk.content_hash.substring(0, 8)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 max-h-96 overflow-y-auto">
                      {chunk.content}
                    </div>
                  </div>
                ))}
                
                {filteredChunks.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-gray-500">
                    No chunks match your search.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar: Metadata */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2 bg-gray-50/50">
                <FileJson className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900">Extracted Metadata</h3>
              </div>
              <div className="p-5 space-y-4">
                {Object.keys(doc.metadata_json || {}).length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No metadata extracted.</p>
                ) : (
                  Object.entries(doc.metadata_json).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
