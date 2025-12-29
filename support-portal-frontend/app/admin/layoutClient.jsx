"use client";
import { useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { Menu, Bell, Search, ShieldCheck, Settings, Globe, Command, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function AdminLayoutClient({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block shrink-0">
        <AdminSidebar />
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
              <AdminSidebar onNavigate={() => setIsSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <div className="hidden md:flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Command className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-900 uppercase tracking-[0.2em]">
                <span>Control</span>
                <span className="text-slate-300">/</span>
                <span className="text-indigo-600">Operations</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden xl:flex items-center gap-3 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl group focus-within:ring-2 focus-within:ring-indigo-600 focus-within:bg-white transition-all w-80">
              <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
              <input
                type="text"
                placeholder="System Command..."
                className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 placeholder:text-slate-300 w-full"
              />
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all group">
                <Globe className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </button>
              <button className="relative p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all group">
                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all group"
                title="Terminate Session"
              >
                <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <div className="h-8 w-[1px] bg-slate-100"></div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-black text-slate-900 tracking-tight leading-none mb-1 uppercase">
                  {typeof window !== "undefined" && (() => {
                    try {
                      const u = localStorage.getItem("user");
                      return u ? JSON.parse(u).name : "Operator";
                    } catch { return "Operator"; }
                  })()}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Status: Active</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 shadow-lg shadow-black/5 overflow-hidden">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

