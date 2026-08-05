"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ArrowRight, Book, MessageCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalLandingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/portal/knowledge?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const categories = [
    { name: "Getting Started", icon: Book, count: 12 },
    { name: "Billing & Account", icon: ShieldCheck, count: 8 },
    { name: "Troubleshooting", icon: MessageCircle, count: 24 },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 bg-gradient-to-b from-sky-50 to-white overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6"
          >
            How can we help you today?
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto"
          >
            Search our knowledge base, ask our AI assistant, or submit a request to our support team.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto"
          >
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 shadow-lg shadow-sky-100/50 text-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all outline-none"
                placeholder="Search for articles, guides, or ask a question..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-2 right-2">
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-6 py-2 h-full font-medium transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <Link href="/portal/knowledge" className="group p-8 rounded-3xl bg-gray-50 hover:bg-sky-50 border border-gray-100 hover:border-sky-100 transition-all text-center block">
              <div className="w-16 h-16 mx-auto bg-white rounded-2xl shadow-sm flex items-center justify-center text-sky-600 mb-6 group-hover:scale-110 transition-transform">
                <Book className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Knowledge Base</h3>
              <p className="text-gray-500 mb-6">Browse our comprehensive guides and tutorials to find answers quickly.</p>
              <span className="inline-flex items-center text-sky-600 font-medium group-hover:translate-x-1 transition-transform">
                Browse Articles <ArrowRight className="ml-2 w-4 h-4" />
              </span>
            </Link>

            <Link href="/portal/ai" className="group p-8 rounded-3xl bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-100 transition-all text-center block">
              <div className="w-16 h-16 mx-auto bg-white rounded-2xl shadow-sm flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Assistant</h3>
              <p className="text-gray-500 mb-6">Chat with our intelligent assistant for instant answers to your questions.</p>
              <span className="inline-flex items-center text-purple-600 font-medium group-hover:translate-x-1 transition-transform">
                Ask AI <ArrowRight className="ml-2 w-4 h-4" />
              </span>
            </Link>

            <Link href="/portal/tickets/new" className="group p-8 rounded-3xl bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-100 transition-all text-center block">
              <div className="w-16 h-16 mx-auto bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Support Ticket</h3>
              <p className="text-gray-500 mb-6">Can't find what you're looking for? Submit a request to our support team.</p>
              <span className="inline-flex items-center text-emerald-600 font-medium group-hover:translate-x-1 transition-transform">
                Submit Request <ArrowRight className="ml-2 w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
