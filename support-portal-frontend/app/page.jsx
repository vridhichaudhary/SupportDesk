"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, LogIn, UserPlus } from "lucide-react";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userJSON = localStorage.getItem("user");
    if (token && userJSON) {
      setIsLoggedIn(true);
      try {
        const user = JSON.parse(userJSON);
        setUserRole(user.role);
      } catch (e) { }
    }
  }, []);

  return (
    <div className="h-screen bg-stone-50 font-sans selection:bg-accent-100 selection:text-accent-900 flex flex-col overflow-hidden">
      {/* Simple Navigation */}
      <nav className="h-20 shrink-0 flex items-center justify-between px-10 lg:px-20 bg-white border-b border-stone-100 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-stone-900 rounded-xl flex items-center justify-center">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-stone-900 tracking-tighter">SupportDesk</span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="bg-white rounded-[32px] border border-stone-200 p-10 shadow-sm text-center">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Support Portal</h2>
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mt-2 px-6">Precision resolution architecture</p>
            </div>

            <div className="space-y-4">
              {isLoggedIn ? (
                <Link
                  href={userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard'}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-stone-900 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.15em] hover:bg-stone-800 transition-all shadow-md active:scale-[0.98]"
                >
                  Return to Dashboard
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="w-full flex items-center justify-center gap-3 py-4 bg-stone-900 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.15em] hover:bg-stone-800 transition-all shadow-md active:scale-[0.98]"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>

                  <div className="relative py-4 flex items-center">
                    <div className="flex-grow border-t border-stone-100"></div>
                    <span className="flex-shrink mx-4 text-[9px] font-black text-stone-200 uppercase tracking-widest">or</span>
                    <div className="flex-grow border-t border-stone-100"></div>
                  </div>

                  <Link
                    href="/signup"
                    className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-stone-200 text-stone-900 rounded-2xl font-bold text-xs uppercase tracking-[0.15em] hover:bg-stone-50 transition-all active:scale-[0.98]"
                  >
                    <UserPlus className="w-4 h-4 text-stone-400" />
                    New Account
                  </Link>
                </>
              )}
            </div>

            <p className="mt-10 text-[9px] font-bold text-stone-300 uppercase tracking-[0.15em]">
              © 2025 SupportDesk Systems
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}