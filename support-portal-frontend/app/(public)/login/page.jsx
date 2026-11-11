"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowRight, Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", remember_me: false });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

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
        }, 600);
      }
    } catch (err) {
      const errDetail =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Failed to sign in. Please verify your credentials.";
      setMessage("⚠️ " + errDetail);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    setMessage("");
    try {
      const res = await axiosInstance.get(`/auth/${provider}`);
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      } else {
        throw new Error("Missing authorization URL");
      }
    } catch (e) {
      const errDetail =
        e.response?.data?.error?.message ||
        e.response?.data?.detail ||
        `Unable to connect to ${provider} OAuth. Please check provider credentials and redirect URI.`;
      setMessage(`⚠️ ${errDetail}`);
      setOauthLoading(null);
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-100 rounded-full text-sky-700 text-[11px] font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            Staff & Admin Access
          </div>

          <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/25 text-white">
            <Lock className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Staff Sign In</h1>
          <p className="text-stone-500 text-xs font-medium mt-1">
            Access your support desk workspace & operations
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                name="email"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50/70 hover:bg-white focus:bg-white border border-stone-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 rounded-xl outline-none text-sm text-stone-900 placeholder:text-stone-400 transition-all font-medium"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-sky-600 hover:text-sky-700 font-semibold transition-colors"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
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

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="remember_me"
              name="remember_me"
              checked={form.remember_me}
              onChange={handleChange}
              className="rounded border-stone-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
            />
            <label htmlFor="remember_me" className="text-xs text-stone-600 font-medium select-none cursor-pointer">
              Remember me on this device
            </label>
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
            className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-sky-600/25 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Authenticating...
              </>
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
          <div className="flex-grow border-t border-stone-200"></div>
          <span className="flex-shrink mx-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
            or continue with
          </span>
          <div className="flex-grow border-t border-stone-200"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={oauthLoading !== null}
            className="py-2.5 px-3 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 text-xs font-bold text-stone-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {oauthLoading === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            disabled={oauthLoading !== null}
            className="py-2.5 px-3 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 text-xs font-bold text-stone-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {oauthLoading === "github" ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
            ) : (
              <svg className="w-4 h-4 text-stone-900" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            )}
            GitHub
          </button>
        </div>

        <div className="mt-8 text-center pt-6 border-t border-stone-200 space-y-2 text-xs text-stone-500">
          <div>
            Need a workspace?{" "}
            <Link href="/signup" className="text-sky-600 hover:text-sky-700 font-bold transition-colors">
              Create Organization
            </Link>
          </div>
          <div>
            Looking for customer support?{" "}
            <Link href="/portal/login" className="text-stone-700 hover:text-stone-900 font-bold underline transition-colors">
              Go to Customer Portal
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}