"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ArrowRight,
  Command,
  Layout,
  Zap,
} from "lucide-react";

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
      <nav className="h-20 shrink-0 flex items-center justify-between px-8 lg:px-16 border-b border-stone-200 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-accent-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-200">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-stone-900 tracking-tight">SupportDesk</span>
        </div>
        <div className="flex items-center gap-8">
          {!isLoggedIn && (
            <Link href="/login" className="text-sm font-bold text-stone-500 hover:text-stone-900 transition-colors uppercase tracking-widest">Sign In</Link>
          )}
          <Link
            href={isLoggedIn ? (userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard') : '/signup'}
            className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-stone-800 transition-all hover:translate-y-[-1px] active:translate-y-[1px] shadow-sm"
          >
            {isLoggedIn ? "Access Dashboard" : "Get Started"}
          </Link>
        </div>
      </nav>

      <main className="flex-1 relative flex items-center justify-center px-6 lg:px-16 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-200/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-stone-200/40 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white text-accent-700 rounded-full border border-stone-200 shadow-sm mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-600"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest">Enterprise Ready Infrastructure</span>
            </div>

            <h1 className="text-6xl lg:text-8xl font-bold text-stone-900 leading-[0.9] tracking-tighter mb-10">
              Modern Support <br />
              <span className="text-accent-600">Simplified.</span>
            </h1>

            <p className="max-w-xl text-xl text-stone-500 font-medium mb-12 leading-relaxed">
              Experience a minimalist support platform architected for clarity. Manage customer interactions with a precision-tuned interface that prioritizes resolution over noise.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5">
              <Link
                href={isLoggedIn ? (userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard') : '/signup'}
                className="px-10 py-5 bg-accent-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-accent-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent-200"
              >
                {isLoggedIn ? "Go to Terminal" : "Initialize Application"}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="px-10 py-5 bg-white text-stone-900 border border-stone-200 rounded-2xl font-bold text-lg hover:bg-stone-50 transition-all shadow-sm">
                View Spec Sheet
              </button>
            </div>

            <div className="mt-16 flex items-center gap-12 border-t border-stone-200 pt-10">
              <div className="flex flex-col gap-1">
                <div className="text-2xl font-bold text-stone-900 tracking-tight">99.9%</div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest text-center">Uptime</div>
              </div>
              <div className="flex flex-col gap-1 text-center">
                <div className="text-2xl font-bold text-stone-900 tracking-tight">250ms</div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Latency</div>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <div className="text-2xl font-bold text-stone-900 tracking-tight">ISO-27001</div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Certified</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            {/* Visual Representation of the Terminal */}
            <div className="bg-white rounded-[40px] border border-stone-200 p-3 shadow-2xl shadow-stone-300 relative overflow-hidden aspect-square flex items-center justify-center group">
              <div className="absolute inset-0 bg-stone-50 overflow-hidden">
                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
              </div>

              <div className="z-10 grid grid-cols-2 gap-4 w-full h-full p-4">
                <div className="bg-white border border-stone-100 rounded-[32px] p-6 shadow-sm flex flex-col justify-between group-hover:border-accent-200 transition-colors">
                  <Command className="w-8 h-8 text-accent-600 mb-4" />
                  <div>
                    <div className="text-lg font-bold text-stone-900 mb-1">Command Sync</div>
                    <p className="text-xs text-stone-400 font-bold leading-tight uppercase tracking-wider">Zero Latency Updates</p>
                  </div>
                </div>
                <div className="bg-stone-900 rounded-[32px] p-6 shadow-lg flex flex-col justify-between">
                  <Layout className="w-8 h-8 text-stone-400 mb-4" />
                  <div>
                    <div className="text-lg font-bold text-white mb-1">Clean Layouts</div>
                    <p className="text-xs text-stone-500 font-bold leading-tight uppercase tracking-wider">Minimalist Architecture</p>
                  </div>
                </div>
                <div className="col-span-2 bg-stone-50 border border-stone-100 rounded-[32px] p-8 flex items-center justify-between group-hover:bg-white transition-colors">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-accent-100 rounded-2xl flex items-center justify-center">
                      <Zap className="w-8 h-8 text-accent-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-stone-900 mb-1">Rapid Resolution</div>
                      <p className="text-sm text-stone-400 font-bold uppercase tracking-widest leading-none">High Frequency Support</p>
                    </div>
                  </div>
                  <ArrowRight className="w-8 h-8 text-stone-200 group-hover:text-accent-600 transition-colors" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="h-20 shrink-0 border-t border-stone-200 px-8 lg:px-16 flex items-center justify-between bg-white/80 backdrop-blur-md z-50">
        <p className="text-stone-400 font-bold text-[10px] uppercase tracking-[0.2em]">© 2025 SupportDesk Systems. All Rights Reserved.</p>
        <div className="flex items-center gap-12 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
          <a href="#" className="hover:text-stone-900 transition-colors">Documentation</a>
          <a href="#" className="hover:text-stone-900 transition-colors">Security</a>
          <a href="#" className="hover:text-stone-900 transition-colors">Privacy</a>
        </div>
      </footer>
    </div>
  );
}