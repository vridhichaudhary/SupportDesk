"use client";
import { useState, useEffect } from "react";
import UserSidebar from "@/components/UserSidebar";
import { Menu, X, Bell, User as UserIcon, Search, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UserLayoutClient({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block shrink-0">
        <UserSidebar />
      </div>

      {/* Sidebar - Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden shadow-2xl"
            >
              <UserSidebar onNavigate={() => setIsSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-400">
              <span>SupportDesk</span>
              <span className="text-slate-200">/</span>
              <span className="text-slate-900 uppercase tracking-widest text-[10px]">Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl group focus-within:ring-2 focus-within:ring-accent-600 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400 group-focus-within:text-accent-600" />
              <input
                type="text"
                placeholder="Universal Search..."
                className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 placeholder:text-slate-300 w-40"
              />
            </div>

            <div className="flex items-center gap-2">
              <button className="relative p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>
              <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="h-8 w-[1px] bg-slate-100 mx-2"></div>

            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-black text-slate-900 tracking-tight leading-none mb-1 text-right">
                  {typeof window !== "undefined" && (() => {
                    try {
                      const u = localStorage.getItem("user");
                      return u ? JSON.parse(u).name : "User";
                    } catch { return "User"; }
                  })()}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Active</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden group-hover:border-accent-600 transition-all">
                <UserIcon className="w-6 h-6 text-slate-400 group-hover:text-accent-600 transition-colors" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

