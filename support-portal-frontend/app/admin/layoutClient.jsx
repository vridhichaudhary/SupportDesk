"use client";
import { useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import { Menu, Search, ShieldCheck, LogOut, Command } from "lucide-react";
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
    <div className="min-h-screen bg-stone-50 flex font-sans selection:bg-accent-100 selection:text-accent-900">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0">
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
              className="fixed inset-0 bg-stone-900/20 backdrop-blur-[2px] z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 w-64 bg-white z-50 lg:hidden shadow-sm"
            >
              <AdminSidebar onNavigate={() => setIsSidebarOpen(false)} />
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
            <div className="hidden md:flex items-center gap-2.5">
              <div className="w-7 h-7 bg-stone-50 rounded-lg flex items-center justify-center border border-stone-200">
                <Command className="w-3.5 h-3.5 text-stone-900" />
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-400">
                <span className="tracking-widest uppercase">Platform</span>
                <span className="text-stone-200">/</span>
                <span className="text-accent-600 uppercase tracking-widest">Control</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg group focus-within:ring-1 focus-within:ring-accent-600 focus-within:bg-white transition-all w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 group-focus-within:text-accent-600" />
              <input
                type="text"
                placeholder="Executive Command..."
                className="bg-transparent border-none outline-none text-[13px] font-medium text-stone-700 placeholder:text-stone-300 w-full"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleLogout}
                className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all group"
                title="Log Out"
              >
                <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            <div className="h-6 w-[1px] bg-stone-200"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[13px] font-bold text-stone-900 tracking-tight leading-none mb-0.5 uppercase">
                  {typeof window !== "undefined" && (() => {
                    try {
                      const u = localStorage.getItem("user");
                      return u ? JSON.parse(u).name : "Operator";
                    } catch { return "Operator"; }
                  })()}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none">System Root</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-stone-900 flex items-center justify-center border border-stone-800 shadow-sm overflow-hidden">
                <ShieldCheck className="w-5 h-5 text-accent-400" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-6 lg:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
