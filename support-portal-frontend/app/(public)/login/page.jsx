"use client";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Mail, Lock, Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
        password: form.password
      });

      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setMessage("✅ Sign-in successful!");

      setTimeout(() => {
        if (user.role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/user/dashboard");
        }
      }, 800);

    } catch (err) {
      console.error("Login error:", err);
      setMessage("⚠️ " + (err?.response?.data?.message || "Invalid credentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-8 text-center border-b border-stone-100">
            <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-stone-100">
              <ShieldCheck className="w-6 h-6 text-accent-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Sign In</h1>
            <p className="text-stone-500 text-sm font-medium mt-1">Access your support terminal</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            <div className="space-y-3">
              <input
                name="email"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-accent-600 outline-none transition-all text-sm font-medium text-stone-900 placeholder:text-stone-400"
                required
                disabled={loading}
              />
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-accent-600 outline-none transition-all text-sm font-medium text-stone-900 placeholder:text-stone-400"
                required
                disabled={loading}
              />
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 rounded-lg text-xs font-bold border ${message.includes('✅')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm'
                    }`}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white py-3 rounded-lg font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
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

          <div className="p-8 text-center border-t border-stone-100 bg-stone-50">
            <p className="text-xs font-medium text-stone-500">
              New to SupportDesk?{" "}
              <Link href="/signup" className="text-accent-600 hover:text-accent-700 font-bold ml-1 transition-colors">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}