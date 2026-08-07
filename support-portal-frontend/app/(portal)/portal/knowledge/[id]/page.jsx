"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, ThumbsUp, ThumbsDown, Check, User } from "lucide-react";
import Link from "next/link";
import axiosInstance from "@/utils/axiosInstance";

export default function PortalArticlePage({ params }) {
  const unwrappedParams = use(params);
  const articleId = unwrappedParams.id;
  
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await axiosInstance.get(`/knowledge/articles/${articleId}`);
        setArticle(res.data?.data || res.data);
      } catch (err) {
        console.error("Failed to fetch article:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [articleId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Article not found</h2>
        <p className="text-gray-500 mb-6">The article you are looking for does not exist or has been removed.</p>
        <Link href="/portal/knowledge" className="text-sky-600 hover:underline">
          &larr; Back to Knowledge Base
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)] py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/portal/knowledge" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-sky-600 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Knowledge Base
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-sky-50 text-sky-600 px-3 py-1 rounded-lg text-sm font-medium">
                {article.category || "General"}
              </span>
              <span className="text-sm text-gray-400">•</span>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <BookOpen className="w-4 h-4" /> {Math.max(1, Math.ceil((article.content?.length || 0) / 1000))} min read
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">
              {article.title}
            </h1>
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-50">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Support Team</div>
                <div className="text-xs text-gray-500">Last updated {new Date(article.updated_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="prose prose-sky sm:prose max-w-none text-gray-800 whitespace-pre-wrap">
              {article.content}
            </div>
          </div>

          {/* Voting / Feedback */}
          <div className="p-8 bg-gray-50 border-t border-gray-100 text-center">
            {voted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-emerald-600"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <p className="font-medium text-lg">Thank you for your feedback!</p>
              </motion.div>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Was this article helpful?</h3>
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setVoted(true)}
                    className="flex items-center gap-2 bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm"
                  >
                    <ThumbsUp className="w-5 h-5" /> Yes
                  </button>
                  <button 
                    onClick={() => setVoted(true)}
                    className="flex items-center gap-2 bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 text-gray-700 px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm"
                  >
                    <ThumbsDown className="w-5 h-5" /> No
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-gray-500 mb-4">Still need help?</p>
              <Link 
                href="/portal/tickets/new" 
                className="inline-flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
              >
                Submit a Support Request
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
