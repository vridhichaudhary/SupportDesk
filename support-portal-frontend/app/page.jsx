"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ArrowRight,
  LogIn,
  UserPlus,
  Zap,
  Sparkles,
  Bot,
  Layers,
  Lock,
  Globe,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userJSON = localStorage.getItem("user");
    if (token && userJSON) {
      setIsLoggedIn(true);
      try {
        setUser(JSON.parse(userJSON));
      } catch (e) {}
    }
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Top Navigation */}
      <nav className="h-20 flex items-center justify-between px-8 lg:px-16 border-b border-stone-800/80 bg-stone-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-stone-200 to-stone-400 bg-clip-text text-transparent">
            SupportDesk <span className="text-indigo-400 text-xs tracking-widest uppercase ml-1 font-mono">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/demo"
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-stone-300 hover:text-white hover:bg-stone-900 rounded-lg transition-all border border-stone-800"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Interactive Demo Mode
          </Link>
          {isLoggedIn ? (
            <Link
              href="/settings/profile"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              Account Settings
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-300 hover:text-white hover:bg-stone-900 rounded-xl transition-all border border-stone-800 flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-500/25 active:scale-95 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Create Workspace
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl space-y-8 z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900/90 border border-indigo-500/30 rounded-full text-indigo-300 text-xs font-mono font-medium shadow-inner">
            <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Next-Generation Customer Support OS</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white leading-[1.1]">
            AI-Powered Support <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-white bg-clip-text text-transparent">
              Built for High-Growth SaaS
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-stone-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Multi-tenant precision architecture with intelligent automation, instant resolution workflows, and full enterprise security.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-3"
            >
              Start Free Workspace
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-white font-bold text-sm uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Explore Guest Demo
            </Link>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left z-10">
          <div className="p-8 rounded-3xl bg-stone-900/50 border border-stone-800/80 hover:border-indigo-500/40 transition-all backdrop-blur-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Autonomous AI Agents</h3>
            <p className="text-stone-400 text-sm leading-relaxed">
              Synthesize tickets, generate instant replies, and draft knowledge articles with contextual LLM reasoning.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-stone-900/50 border border-stone-800/80 hover:border-violet-500/40 transition-all backdrop-blur-sm">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 text-violet-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Strict Multi-Tenancy</h3>
            <p className="text-stone-400 text-sm leading-relaxed">
              Logical organization boundaries, isolated tenant roots, audit logging, and role-based permissions.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-stone-900/50 border border-stone-800/80 hover:border-emerald-500/40 transition-all backdrop-blur-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Argon2 & JWT Rotation</h3>
            <p className="text-stone-400 text-sm leading-relaxed">
              Argon2id password hashing, HTTP-Only refresh token rotation, device session tracking, and OAuth 2.0.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-stone-900 text-center text-xs text-stone-500 font-mono">
        SupportDesk AI © 2026 — Production Engineering Foundation
      </footer>
    </div>
  );
}