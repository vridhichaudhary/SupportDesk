"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileText, Upload, MoreVertical, Search, Loader2, Trash2, 
  RefreshCw, CheckCircle2, XCircle, Clock
} from "lucide-react";
import { format } from "date-fns";

import api from "@/utils/axiosInstance";
import UploadDocumentModal from "@/components/UploadDocumentModal";
import ErrorCard from "@/components/ErrorCard";

const statusConfig = {
  UPLOADED: { color: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock, label: "Uploaded" },
  QUEUED: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock, label: "Queued" },
  PROCESSING: { color: "bg-purple-50 text-purple-700 border-purple-200", icon: Loader2, label: "Processing" },
  COMPLETED: { color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2, label: "Completed" },
  FAILED: { color: "bg-red-50 text-red-700 border-red-200", icon: XCircle, label: "Failed" },
  ARCHIVED: { color: "bg-gray-100 text-gray-500 border-gray-200", icon: Trash2, label: "Archived" },
};

export default function DocumentsHub() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Auto-refresh timer for processing documents
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);
  
  // Poll if any documents are processing
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'PROCESSING' || d.status === 'QUEUED' || d.status === 'UPLOADED');
    if (hasProcessing) {
      const interval = setInterval(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [documents]);

  const fetchDocuments = async () => {
    try {
      const res = await api.get("/documents?limit=50");
      setDocuments(res.data.items);
    } catch (err) {
      setError(err);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (newDoc) => {
    setDocuments(prev => [newDoc, ...prev]);
    setIsUploadModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert("Failed to delete document.");
    }
  };

  const handleRetry = async (id) => {
    try {
      const res = await api.post(`/documents/${id}/retry`);
      setDocuments(prev => prev.map(d => d.id === id ? res.data : d));
    } catch (err) {
      alert("Failed to retry document.");
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50/50">
      <div className="max-w-[1400px] mx-auto p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Documents Hub</h1>
            <p className="text-sm text-gray-500 mt-1">
              Enterprise ingestion pipeline for AI knowledge extraction.
            </p>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
            />
          </div>
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <ErrorCard error={error} onRetry={fetchDocuments} />
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && documents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      Loading pipeline...
                    </td>
                  </tr>
                ) : filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-900 font-medium mb-1">No documents found</p>
                      <p className="text-sm">Upload a document to start extraction.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => {
                    const status = statusConfig[doc.status] || statusConfig.UPLOADED;
                    const StatusIcon = status.icon;
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <Link href={`/admin/documents/${doc.id}`} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {doc.title}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                <span className="uppercase">{doc.mime_type.split('/').pop()?.substring(0, 15)}</span>
                                {doc.page_count && (
                                  <>
                                    <span>•</span>
                                    <span>{doc.page_count} pages</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                            <StatusIcon className={`w-3.5 h-3.5 ${doc.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                            {status.label}
                          </div>
                          {doc.error_message && (
                            <div className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={doc.error_message}>
                              {doc.error_message}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatBytes(doc.file_size)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {format(new Date(doc.created_at), "MMM d, yyyy h:mm a")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(doc.status === 'FAILED' || doc.status === 'UPLOADED') && (
                              <button
                                onClick={() => handleRetry(doc.id)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Retry Processing"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <UploadDocumentModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
