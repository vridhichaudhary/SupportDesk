"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, LogIn, ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", remember_me: false });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.email || !form.password) {
      setMessage("⚠️ Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const res = await axiosInstance.post("/auth/login", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        remember_me: form.remember_me,
      });

      const tokenData = res.data?.data;
      if (tokenData?.access_token) {
        localStorage.setItem("token", tokenData.access_token);
        if (tokenData.refresh_token) {
          localStorage.setItem("refresh_token", tokenData.refresh_token);
        }
      }

      // Fetch current user details
      const meRes = await axiosInstance.get("/auth/me");
      if (meRes.data?.data) {
        const user = meRes.data.data;
        localStorage.setItem("user", JSON.stringify(user));
        setMessage("✅ Sign-in successful!");
        setTimeout(() => {
          if (user.role === "CUSTOMER") {
            router.push("/portal/dashboard");
          } else {
            router.push("/admin/dashboard");
          }
        }, 800);
      }
    } catch (err) {
      const errDetail = err.response?.data?.error?.message || err.message || "Failed to sign in.";
      setMessage("⚠️ " + errDetail);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    try {
      const res = await axiosInstance.get(`/auth/${provider}`);
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (e) {
      setMessage(`⚠️ Unable to connect to ${provider} OAuth`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 font-sans text-stone-100">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Sign In</h1>
            <p className="text-stone-400 text-xs font-medium mt-1">Access your SupportDesk workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Email Address</label>
              <input
                name="email"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl focus:border-indigo-500 outline-none text-sm text-white placeholder:text-stone-600 transition-all"
                required
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">Password</label>
                <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot?
                </Link>
              </div>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl focus:border-indigo-500 outline-none text-sm text-white placeholder:text-stone-600 transition-all"
                required
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember_me"
                name="remember_me"
                checked={form.remember_me}
                onChange={handleChange}
                className="rounded border-stone-800 bg-stone-950 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="remember_me" className="text-xs text-stone-400">
                Remember me on this device
              </label>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
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
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Authenticate
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* OAuth Dividers */}
          <div className="relative py-4 flex items-center my-2">
            <div className="flex-grow border-t border-stone-800"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              or continue with
            </span>
            <div className="flex-grow border-t border-stone-800"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOAuth("google")}
              className="py-2.5 bg-stone-950 border border-stone-800 hover:border-stone-700 text-xs font-bold text-stone-300 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Google
            </button>
            <button
              onClick={() => handleOAuth("github")}
              className="py-2.5 bg-stone-950 border border-stone-800 hover:border-stone-700 text-xs font-bold text-stone-300 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              GitHub
            </button>
          </div>

          <div className="mt-8 text-center pt-6 border-t border-stone-800 text-xs text-stone-400">
            Need a workspace?{" "}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold ml-1 transition-colors">
              Create Organization
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}