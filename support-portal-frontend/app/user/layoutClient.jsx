"use client";
import { useState, useEffect } from "react";
import UserSidebar from "@/components/UserSidebar";
import { Menu, Bell, User as UserIcon, Search, Settings, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UserLayoutClient({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans selection:bg-accent-100 selection:text-accent-900">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0">
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
              className="fixed inset-0 bg-stone-900/20 backdrop-blur-[2px] z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 w-64 bg-white z-50 lg:hidden shadow-sm"
            >
              <UserSidebar onNavigate={() => setIsSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-stone-50 rounded-lg transition-colors border border-stone-100"
            >
              <Menu className="w-5 h-5 text-stone-600" />
            </button>
            <div className="hidden md:flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent-600" />
              <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
                <span className="tracking-tight">SupportDesk</span>
                <span className="text-stone-200">/</span>
                <span className="text-stone-900 uppercase tracking-widest text-[10px]">Portal</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg group focus-within:ring-1 focus-within:ring-accent-600 focus-within:bg-white transition-all">
              <Search className="w-3.5 h-3.5 text-stone-400 group-focus-within:text-accent-600" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-[13px] font-medium text-stone-700 placeholder:text-stone-300 w-32 focus:w-48 transition-all"
              />
            </div>

            <div className="flex items-center gap-1">
              <button className="relative p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all">
                <Bell className="w-4 h-4" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent-600 rounded-full border border-white"></span>
              </button>
            </div>

            <div className="h-6 w-[1px] bg-stone-200 mx-1"></div>

            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right hidden sm:block">
                <div className="text-[13px] font-bold text-stone-900 tracking-tight leading-none mb-0.5">
                  {typeof window !== "undefined" && (() => {
                    try {
                      const u = localStorage.getItem("user");
                      return u ? JSON.parse(u).name : "User";
                    } catch { return "User"; }
                  })()}
                </div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none">Standard Access</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center border border-stone-200 overflow-hidden group-hover:border-accent-600 transition-all">
                <UserIcon className="w-4 h-4 text-stone-400 group-hover:text-accent-600 transition-colors" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-6 lg:p-10">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
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

