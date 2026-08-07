"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ArrowRight,
  LogIn,
  UserPlus,
  Bot,
  Layers,
  Lock,
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
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-accent-100 selection:text-accent-900 flex flex-col">
      {/* Top Navigation */}
      <nav className="h-16 flex items-center justify-between px-6 lg:px-10 border-b border-stone-200 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-accent-600 w-6 h-6" />
          <span className="text-lg font-bold tracking-tight text-stone-900">
            SupportDesk <span className="text-accent-600 text-[10px] tracking-widest uppercase ml-0.5">Platform</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
              <Link
                href="/portal/login"
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Customer Portal
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-50 border border-accent-100 rounded-full text-accent-700 text-[11px] font-bold uppercase tracking-widest">
            Enterprise Support Platform
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-900 leading-[1.1]">
            Intelligent Support for <br />
            Modern Organizations
          </h1>

          <p className="text-base text-stone-500 max-w-2xl mx-auto font-medium leading-relaxed">
            A cohesive platform combining ticketing, autonomous AI agents, knowledge base management, and multi-tenant security for high-growth SaaS teams.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              Staff Access
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/portal/login"
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-semibold text-sm rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              Customer Portal
            </Link>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center mb-4 text-accent-600">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-2">Autonomous AI Agents</h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              Synthesize tickets, generate instant replies, and draft knowledge articles with contextual LLM reasoning.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center mb-4 text-stone-700">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-2">Strict Multi-Tenancy</h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              Logical organization boundaries, isolated tenant roots, audit logging, and role-based permissions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center mb-4 text-stone-700">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-stone-900 mb-2">Enterprise Security</h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              Argon2id password hashing, secure token rotation, device session tracking, and strict CORS policies.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-stone-200 bg-white text-center text-[11px] text-stone-400 font-medium tracking-wide uppercase">
        SupportDesk AI © 2026
      </footer>
    </div>
  );
}