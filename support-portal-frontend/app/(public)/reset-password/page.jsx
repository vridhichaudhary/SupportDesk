"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("⚠️ Invalid or missing password reset token.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("⚠️ Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await axiosInstance.post("/auth/reset-password", {
        token: token,
        new_password: newPassword,
      });
      setMessage("✅ Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err) {
      const errDetail = err.response?.data?.error?.message || err.message || "Password reset failed.";
      setMessage("⚠️ " + errDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">New Password</label>
        <input
          type="password"
          placeholder="Min 8 chars (1 upper, 1 lower, 1 digit, 1 spec)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl focus:border-indigo-500 outline-none text-sm text-white placeholder:text-stone-600 transition-all"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Confirm Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Update Password <ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 font-sans text-stone-100">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl relative">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">New Password</h1>
            <p className="text-stone-400 text-xs font-medium mt-1">Set a new strong password for your account</p>
          </div>

          <Suspense fallback={<div className="text-center text-stone-400 py-4">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </motion.div>
    </div>
  );
}
