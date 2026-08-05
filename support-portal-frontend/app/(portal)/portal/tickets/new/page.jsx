"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Bot, Info, ArrowRight, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import axiosInstance from "@/utils/axiosInstance";
import PortalGuard from "@/components/portal/PortalGuard";

export default function NewTicketPage() {
  const router = useRouter();
  const [form, setForm] = useState({ subject: "", body: "", category: "GENERAL", priority: "MEDIUM" });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  
  // Debounced search for AI deflection
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (form.subject.length < 10) {
        setSuggestions([]);
        return;
      }
      
      setSuggesting(true);
      try {
        const res = await axiosInstance.get(`/knowledge/search?q=${encodeURIComponent(form.subject)}&limit=3`);
        if (res.data?.data?.items) {
          setSuggestions(res.data.data.items);
        }
      } catch (err) {
        console.error("AI deflection error:", err);
      } finally {
        setSuggesting(false);
      }
    };
    
    const timeoutId = setTimeout(fetchSuggestions, 800);
    return () => clearTimeout(timeoutId);
  }, [form.subject]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.body) return;

    setLoading(true);
    try {
      const res = await axiosInstance.post("/tickets", {
        subject: form.subject,
        body: form.body,
        category: form.category,
        priority: form.priority,
      });
      if (res.data?.data?.id) {
        router.push(`/portal/tickets/${res.data.data.id}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create ticket.");
      setLoading(false);
    }
  };

  return (
    <PortalGuard>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <nav className="flex text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li><Link href="/portal/dashboard" className="hover:text-gray-900 transition-colors">Dashboard</Link></li>
              <li><ChevronRight className="w-4 h-4" /></li>
              <li><Link href="/portal/tickets" className="hover:text-gray-900 transition-colors">Tickets</Link></li>
              <li><ChevronRight className="w-4 h-4" /></li>
              <li className="text-gray-900 font-medium" aria-current="page">New Request</li>
            </ol>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Submit a Request</h1>
          <p className="text-gray-500 mt-1">Please provide as much detail as possible so we can help you faster.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none bg-gray-50 focus:bg-white"
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
                        <div className="flex items-center gap-2 text-sky-700 font-medium mb-3">
                          <Bot className="w-5 h-5" />
                          <span>AI Suggestion: Might these help?</span>
                        </div>
                        <div className="space-y-2">
                          {suggestions.map((article) => (
                            <Link 
                              key={article.id} 
                              href={`/portal/knowledge/${article.id}`}
                              target="_blank"
                              className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-sm border border-transparent hover:border-sky-200 transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-gray-400 group-hover:text-sky-500" />
                                <span className="text-gray-700 group-hover:text-gray-900">{article.title}</span>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-sky-500" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    name="body"
                    value={form.body}
                    onChange={handleChange}
                    rows={8}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none bg-gray-50 focus:bg-white resize-none"
                    placeholder="Please include error messages, steps to reproduce, or any other relevant details."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none bg-gray-50 focus:bg-white"
                    >
                      <option value="GENERAL">General Inquiry</option>
                      <option value="TECHNICAL">Technical Support</option>
                      <option value="BILLING">Billing & Account</option>
                      <option value="BUG_REPORT">Bug Report</option>
                      <option value="FEATURE_REQUEST">Feature Request</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      name="priority"
                      value={form.priority}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none bg-gray-50 focus:bg-white"
                    >
                      <option value="LOW">Low - Minimal impact</option>
                      <option value="MEDIUM">Medium - Partial disruption</option>
                      <option value="HIGH">High - Significant impact</option>
                      <option value="URGENT">Urgent - System down</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || !form.subject || !form.body}
                    className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-sky-50 rounded-2xl p-6 border border-sky-100 sticky top-24">
              <div className="flex items-center gap-2 text-sky-700 font-bold mb-4">
                <Info className="w-5 h-5" />
                Before you submit
              </div>
              <ul className="space-y-4 text-sm text-sky-800">
                <li className="flex gap-2">
                  <span className="font-bold block mt-0.5">•</span>
                  <span>Check our <Link href="/portal/knowledge" className="underline font-medium hover:text-sky-900">Knowledge Base</Link> first. Most common questions are answered there.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold block mt-0.5">•</span>
                  <span>Include specific error messages, URLs, or screenshots if applicable.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold block mt-0.5">•</span>
                  <span>Describe the steps to reproduce the issue clearly.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PortalGuard>
  );
}
