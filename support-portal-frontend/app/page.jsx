"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  Cpu,
  BarChart3,
  Check
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

  const features = [
    {
      icon: MessageSquare,
      title: "Clean Communication",
      desc: "An intuitive interface designed for clear and rapid issue resolution."
    },
    {
      icon: Cpu,
      title: "Smart Efficiency",
      desc: "Optimized workflows that prioritize productive support interactions."
    },
    {
      icon: BarChart3,
      title: "Precise Analytics",
      desc: "Straightforward metrics to monitor and improve support performance."
    }
  ];

  return (
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-accent-100 selection:text-accent-900">
      {/* Simple Navigation */}
      <nav className="h-16 flex items-center justify-between px-6 lg:px-12 border-b border-stone-200 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-accent-600 w-6 h-6" />
          <span className="text-xl font-bold text-stone-900 tracking-tight">SupportDesk</span>
        </div>
        <div className="flex items-center gap-6">
          {!isLoggedIn && (
            <Link href="/login" className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">Sign In</Link>
          )}
          <Link
            href={isLoggedIn ? (userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard') : '/signup'}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg font-semibold text-sm hover:bg-stone-800 transition-colors"
          >
            {isLoggedIn ? "Dashboard" : "Get Started"}
          </Link>
        </div>
      </nav>

      <main>
        {/* Minimal Hero Section */}
        <section className="py-24 px-6 lg:px-12 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-50 text-accent-700 rounded-full border border-accent-100 mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider">Reliable Infrastructure</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold text-stone-900 leading-tight tracking-tight mb-8">
              Modern Support <br />
              <span className="text-accent-600">Simplified.</span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg text-stone-500 font-medium mb-12 leading-relaxed">
              A minimalist support platform built for professional teams. <br className="hidden md:block" />
              Focus on what matters: resolving customer needs with precision.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href={isLoggedIn ? (userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard') : '/signup'}
                className="px-8 py-3.5 bg-accent-600 text-white rounded-xl font-bold text-base flex items-center gap-2 hover:bg-accent-700 transition-colors shadow-sm"
              >
                {isLoggedIn ? "Go to Terminal" : "Initialize Application"}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button className="px-8 py-3.5 bg-white text-stone-900 border border-stone-200 rounded-xl font-bold text-base hover:bg-stone-50 transition-colors shadow-sm">
                Documentation
              </button>
            </div>
          </motion.div>
        </section>

        {/* Clean Static Showcase */}
        <section className="px-6 lg:px-12 py-12 max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl border border-stone-200 p-2 shadow-sm">
            <div className="bg-stone-50 border border-stone-100 rounded-2xl h-[400px] w-full flex items-center justify-center overflow-hidden">
              <div className="text-center p-12">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-stone-200 flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-accent-600" />
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-3 tracking-tight">SupportDesk Core</h3>
                <p className="text-stone-500 font-medium text-sm">Active & Secure Operational Layer</p>

                <div className="mt-8 flex items-center justify-center gap-8">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
                    <Check className="w-4 h-4 text-emerald-500" /> Real-time Sync
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
                    <Check className="w-4 h-4 text-emerald-500" /> Secure Encryption
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
                    <Check className="w-4 h-4 text-emerald-500" /> Clean Interfaces
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Minimal Features */}
        <section className="py-24 px-6 lg:px-12 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {features.map((f, i) => (
                <div key={i} className="group">
                  <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center mb-6 border border-stone-100 group-hover:bg-accent-50 group-hover:border-accent-100 transition-colors">
                    <f.icon className="text-stone-900 group-hover:text-accent-600 w-6 h-6 transition-colors" />
                  </div>
                  <h4 className="text-xl font-bold text-stone-900 mb-3">{f.title}</h4>
                  <p className="text-stone-500 text-sm font-medium leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Minimal CTA */}
        <section className="py-24 px-6 lg:px-12 text-center">
          <div className="max-w-4xl mx-auto py-16 px-8 bg-accent-600 rounded-3xl text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full"></div>
            <h3 className="text-3xl font-bold mb-6 tracking-tight">Ready to streamline your support?</h3>
            <p className="text-accent-100 text-lg mb-10 max-w-xl mx-auto">
              Join professional teams using SupportDesk to manage their customer interactions with unmatched clarity.
            </p>
            <Link href="/signup" className="inline-flex px-8 py-4 bg-white text-accent-600 rounded-xl font-bold text-lg hover:bg-stone-50 transition-colors shadow-sm active:scale-95">
              Start Your Path
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-stone-200 px-6 lg:px-12 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-accent-600 w-5 h-5" />
            <span className="text-lg font-bold text-stone-900 tracking-tight">SupportDesk</span>
          </div>
          <div className="flex items-center gap-8 text-xs font-bold text-stone-400 uppercase tracking-widest">
            <a href="#" className="hover:text-stone-900 transition-colors">Docs</a>
            <a href="#" className="hover:text-stone-900 transition-colors">Security</a>
            <a href="#" className="hover:text-stone-900 transition-colors">Privacy</a>
          </div>
          <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest">© 2025 SupportDesk Systems.</p>
        </div>
      </footer>
    </div>
  );
}