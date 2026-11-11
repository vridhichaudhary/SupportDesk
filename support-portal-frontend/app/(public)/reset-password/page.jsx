"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      }, 1000);
    } catch (err) {
      const errDetail =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Password reset failed.";
      setMessage("⚠️ " + errDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
          New Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Min 8 chars (1 upper, 1 lower, 1 digit, 1 spec)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-stone-50/70 hover:bg-white focus:bg-white border border-stone-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 rounded-xl outline-none text-sm text-stone-900 placeholder:text-stone-400 transition-all font-medium"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            Updating Password...
          </>
        ) : (
          <>
            Update Password <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">New Password</h1>
          <p className="text-stone-500 text-xs font-medium mt-1">
            Set a new strong password for your staff account
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-stone-400 py-4 text-xs font-medium">Loading form...</div>}>
          <ResetPasswordForm />
        </Suspense>

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
