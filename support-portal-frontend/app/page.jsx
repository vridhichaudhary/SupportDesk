"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ArrowRight,
  Zap,
  Layers,
  Globe,
  MessageSquare,
  CheckCircle2,
  Cpu,
  BarChart3
} from "lucide-react";

export default function Home() {
  const router = useRouter();
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

  const features = [
    {
      icon: MessageSquare,
      title: "Intelligent Dialogues",
      desc: "Context-aware AI that resolves queries instantly."
    },
    {
      icon: Cpu,
      title: "Agentic Autonomy",
      desc: "Smart routing systems that handle complexity on autopilot."
    },
    {
      icon: BarChart3,
      title: "Real-time Metrics",
      desc: "Oversight tools for global support synchronization."
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full h-20 bg-white/80 backdrop-blur-xl z-50 border-b border-slate-100 flex items-center justify-between px-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <ShieldCheck className="text-accent-500 w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tighter italic">SupportDesk</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest">Sign In</Link>
          <Link href="/signup" className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:shadow-xl hover:shadow-slate-200 transition-all active:scale-95">
            Join Network
          </Link>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-32 px-10 text-center overflow-hidden">
          {/* Background elements */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-slate-900/5 px-4 py-1.5 rounded-full border border-slate-900/10 mb-8">
              <Zap className="w-4 h-4 text-accent-600 fill-accent-600" />
              <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Next-Gen Support Intelligence</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter mb-8 leading-[0.9]">
              Engineering <span className="gradient-text italic">Excellence</span> <br />
              in Support.
            </h1>

            <p className="max-w-2xl mx-auto text-xl text-slate-500 font-medium mb-12 leading-relaxed">
              A high-performance SaaS platform built for modern scale. <br className="hidden md:block" />
              Deploying agentic intelligence to synchronize support operations globally.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              {isLoggedIn ? (
                <Link
                  href={userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard'}
                  className="group px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-bold text-lg flex items-center gap-3 hover:shadow-2xl hover:shadow-accent-500/20 transition-all active:scale-95"
                >
                  Return to Terminal
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="group px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-bold text-lg flex items-center gap-3 hover:shadow-2xl hover:shadow-accent-500/20 transition-all active:scale-95"
                >
                  Initialize Account
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              )}
              <button className="px-10 py-5 bg-white text-slate-900 border border-slate-200 rounded-[2rem] font-bold text-lg hover:bg-slate-50 transition-all">
                Technical Specs
              </button>
            </div>
          </motion.div>

          {/* Visual Mock/Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mt-24 px-4"
          >
            <div className="max-w-6xl mx-auto bg-slate-900 rounded-[3rem] p-4 shadow-3xl overflow-hidden relative border-[12px] border-slate-900">
              <div className="bg-slate-800 rounded-[2rem] h-[500px] w-full flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-accent-600/20"></div>
                <div className="flex flex-col items-center relative z-10 text-center px-10">
                  <Layers className="w-20 h-20 text-accent-500 mb-8 animate-pulse" />
                  <h3 className="text-4xl font-black text-white mb-2 italic">SupportStream v4.0.0</h3>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Synchronizing Active Nodes...</p>
                </div>
                {/* Decorative UI elements */}
                <div className="absolute bottom-10 left-10 w-48 h-32 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 p-4">
                  <div className="w-full h-1.5 bg-emerald-500/40 rounded-full mb-3"></div>
                  <div className="w-2/3 h-1.5 bg-emerald-500/40 rounded-full"></div>
                </div>
                <div className="absolute top-10 right-10 w-64 h-48 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="w-full h-2 bg-indigo-500/30 rounded-full"></div>
                    <div className="w-full h-2 bg-indigo-500/30 rounded-full"></div>
                    <div className="w-4/5 h-2 bg-indigo-500/30 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="py-32 bg-slate-50 px-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-xs font-black text-accent-600 uppercase tracking-[0.4em] mb-4">Core Architecture</h2>
              <h3 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">Built for Enterprise Grade Performance.</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -10 }}
                  className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50"
                >
                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-slate-200">
                    <f.icon className="text-white w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 mb-4">{f.title}</h4>
                  <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Global Access Section */}
        <section className="py-32 px-10 relative overflow-hidden">
          <div className="max-w-5xl mx-auto bg-slate-900 rounded-[3rem] p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
              <div className="md:w-3/5 text-center md:text-left">
                <div className="inline-flex items-center gap-2 text-accent-400 mb-6">
                  <Globe className="w-5 h-5 animate-spin-slow" />
                  <span className="text-xs font-black uppercase tracking-widest">Global Operations</span>
                </div>
                <h3 className="text-5xl font-black text-white tracking-tight mb-8">Deploy your support network worldwide.</h3>
                <p className="text-slate-400 text-lg font-medium leading-relaxed mb-0">
                  Infinite scalability across 20+ global regions. Built on a low-latency network optimized for high-velocity support interactions.
                </p>
              </div>
              <div className="md:w-2/5 flex justify-center">
                <Link href="/signup" className="group px-12 py-6 bg-accent-500 text-slate-900 rounded-[2rem] font-bold text-xl flex items-center gap-3 hover:bg-accent-400 transition-all active:scale-95 shadow-2xl shadow-accent-500/40">
                  Start Free
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-accent-500 w-5 h-5" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tighter italic">SupportDesk</span>
          </div>
          <div className="flex items-center gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-slate-900 transition-colors">Documentation</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Security</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Infrastructure</a>
          </div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">© 2025 SupportDesk Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}