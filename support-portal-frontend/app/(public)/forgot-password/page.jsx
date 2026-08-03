"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!email) {
      setMessage("⚠️ Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      await axiosInstance.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setMessage("✅ If an account exists, password reset instructions have been sent to your email.");
    } catch (err) {
      setMessage("⚠️ Unable to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 font-sans text-stone-100">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl relative">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Reset Password</h1>
            <p className="text-stone-400 text-xs font-medium mt-1">Enter your work email to receive reset instructions</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl focus:border-indigo-500 outline-none text-sm text-white placeholder:text-stone-600 transition-all"
                required
                disabled={loading}
              />
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 rounded-xl text-xs font-bold border ${
                    message.includes("✅")
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send Reset Instructions <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-stone-800">
            <Link href="/login" className="text-xs font-bold text-stone-400 hover:text-white flex items-center justify-center gap-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
