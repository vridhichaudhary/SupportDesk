"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Book, Folder, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import axiosInstance from "@/utils/axiosInstance";

export default function PortalKnowledgePage() {
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKnowledgeBase();
  }, []);

  const fetchKnowledgeBase = async () => {
    setLoading(true);
    try {
      // For this prototype, we'll fetch articles and group them by category locally
      const res = await axiosInstance.get("/knowledge?limit=100");
      const items = res.data?.data?.items || [];
      
      // Group by category
      const grouped = {};
      items.forEach(article => {
        const cat = article.category || "General";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(article);
      });
      
      const catsArray = Object.keys(grouped).map(name => ({
        name,
        articles: grouped[name],
        count: grouped[name].length
      }));
      
      setCategories(catsArray);
      setArticles(items);
    } catch (err) {
      console.error("Failed to fetch knowledge base:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = search.trim() === "" 
    ? [] 
    : articles.filter(a => 
        a.title.toLowerCase().includes(search.toLowerCase()) || 
        a.content.toLowerCase().includes(search.toLowerCase())
      );

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <div className="bg-sky-600 py-16 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl -top-20 -left-20"></div>
          <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl top-20 right-20"></div>
        </div>
        
        <div className="relative max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Knowledge Base
          </h1>
          <p className="text-sky-100 text-lg mb-8 max-w-2xl mx-auto">
            Find step-by-step guides, tutorials, and answers to frequently asked questions.
          </p>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-4 rounded-2xl border-0 shadow-xl text-lg focus:ring-2 focus:ring-sky-300 outline-none transition-all"
              placeholder="Search for answers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
          </div>
        ) : search.trim() !== "" ? (
          // Search Results View
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Search Results for "{search}" ({filteredArticles.length})
            </h2>
            
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">We couldn't find any articles matching your search.</p>
                <button
                  onClick={() => setSearch("")}
                  className="text-sky-600 font-medium hover:text-sky-700"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {filteredArticles.map(article => (
                    <Link
                      key={article.id}
                      href={`/portal/knowledge/${article.id}`}
                      className="block p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1 flex-shrink-0 text-sky-500">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{article.title}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2">
                            {article.content.substring(0, 150)}...
                          </p>
                          <div className="mt-2 text-xs font-medium text-sky-600 bg-sky-50 px-2 py-1 rounded-md inline-block">
                            {article.category || "General"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Browse View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={category.name} 
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{category.name}</h2>
                    <p className="text-sm text-gray-500">{category.count} articles</p>
                  </div>
                </div>
                
                <ul className="space-y-3">
                  {category.articles.slice(0, 5).map(article => (
                    <li key={article.id}>
                      <Link 
                        href={`/portal/knowledge/${article.id}`}
                        className="flex items-start text-sm text-gray-600 hover:text-sky-600 group transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-sky-500 mt-0.5 mr-1 flex-shrink-0" />
                        <span className="truncate">{article.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                
                {category.count > 5 && (
                  <button className="mt-4 text-sm font-medium text-sky-600 hover:text-sky-700 inline-flex items-center">
                    View all {category.count} articles <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                )}
              </motion.div>
            ))}
            
            {categories.length === 0 && !loading && (
              <div className="col-span-full text-center py-12">
                <Book className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-900 font-medium">No articles yet</h3>
                <p className="text-gray-500 mt-1">Our knowledge base is currently empty.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
