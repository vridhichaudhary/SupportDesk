"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight } from "lucide-react";

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
    <div className="h-screen bg-white font-sans selection:bg-accent-100 selection:text-accent-900 flex flex-col overflow-hidden">
      {/* Ultra Minimal Navigation */}
      <nav className="h-20 flex items-center justify-between px-10 lg:px-20 border-b border-stone-100 bg-white z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-stone-900 tracking-tighter">SupportDesk</span>
        </div>

        <div className="flex items-center gap-10">
          {!isLoggedIn ? (
            <Link href="/login" className="text-[10px] font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-[0.2em]">Enter Portal</Link>
          ) : null}
          <Link
            href={isLoggedIn ? (userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard') : '/signup'}
            className="px-5 py-2.5 bg-stone-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-all shadow-sm"
          >
            {isLoggedIn ? "Access Dashboard" : "Initialize Session"}
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-xl"
        >
          <div className="inline-block px-3 py-1 bg-stone-50 border border-stone-100 text-stone-400 rounded-full mb-8">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Operational Excellence</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-stone-900 leading-[1.1] tracking-tighter mb-6">
            Intelligent Support <br />
            <span className="text-accent-600">Architected for Clarity.</span>
          </h1>

          <p className="text-sm text-stone-400 font-medium mb-10 leading-relaxed max-w-md mx-auto">
            Experience a streamlined interface designed for precision resolution. No noise. Just resolution.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={isLoggedIn ? (userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard') : '/signup'}
              className="w-full sm:w-auto px-8 py-3.5 bg-stone-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-stone-800 transition-all shadow-md active:scale-95"
            >
              {isLoggedIn ? "Go to Dashboard" : "Get Started"}
            </Link>
            <button className="w-full sm:w-auto px-8 py-3.5 bg-white text-stone-900 border border-stone-100 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-stone-50 transition-all">
              Technical Docs
            </button>
          </div>
        </motion.div>
      </main>

      <footer className="h-20 border-t border-stone-100 px-10 lg:px-20 flex items-center justify-between bg-white z-50">
        <p className="text-stone-300 font-bold text-[9px] uppercase tracking-[0.2em]">© 2025 SUPPORTDESK SYSTEMS.</p>
        <div className="flex items-center gap-10 text-[9px] font-bold text-stone-300 uppercase tracking-widest">
          <a href="#" className="hover:text-stone-900 transition-colors">Security</a>
          <a href="#" className="hover:text-stone-900 transition-colors">Privacy</a>
        </div>
      </footer>
    </div>
  );
}