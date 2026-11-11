"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, ArrowRight, Loader2, ArrowLeft, Mail } from "lucide-react";
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md"
    >
      <div className="bg-white border border-stone-200/80 rounded-3xl p-8 sm:p-10 shadow-xl shadow-sky-100/50">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/25 text-white">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Reset Password</h1>
          <p className="text-stone-500 text-xs font-medium mt-1">
            Enter your work email to receive password reset instructions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50/70 hover:bg-white focus:bg-white border border-stone-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 rounded-xl outline-none text-sm text-stone-900 placeholder:text-stone-400 transition-all font-medium"
                required
                disabled={loading}
              />
            </div>
          </div>

          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl text-xs font-semibold border ${
                  message.includes("✅")
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-sky-600/25 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending Instructions...
              </>
            ) : (
              <>
                Send Reset Instructions
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-stone-200">
          <Link
            href="/login"
            className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
