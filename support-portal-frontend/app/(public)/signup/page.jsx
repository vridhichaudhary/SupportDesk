"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, UserPlus, ArrowRight, Loader2, Building, Mail, Lock, User } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    organization_name: "",
    industry: "Technology",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.organization_name || !form.first_name || !form.last_name || !form.email || !form.password) {
      setMessage("⚠️ Please complete all required fields");
      return;
    }

    setLoading(true);

    try {
      const res = await axiosInstance.post("/auth/signup", {
        organization_name: form.organization_name.trim(),
        industry: form.industry,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      const tokenData = res.data?.data;
      if (tokenData?.access_token) {
        localStorage.setItem("token", tokenData.access_token);
        if (tokenData.refresh_token) {
          localStorage.setItem("refresh_token", tokenData.refresh_token);
        }
      }

      // Fetch user profile
      const meRes = await axiosInstance.get("/auth/me");
      if (meRes.data?.data) {
        localStorage.setItem("user", JSON.stringify(meRes.data.data));
      }

      setMessage("✅ Organization & Owner account created!");
      setTimeout(() => {
        router.push("/settings/profile");
      }, 1000);
    } catch (err) {
      const errDetail = err.response?.data?.error?.message || err.message || "Signup failed.";
      setMessage("⚠️ " + errDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 p-6 font-sans text-stone-100">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
              <Building className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Create Workspace</h1>
            <p className="text-stone-400 text-xs font-medium mt-1">Set up your Organization & Owner account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Organization Name</label>
              <input
                name="organization_name"
                type="text"
                placeholder="e.g. NovaCart Commerce"
                value={form.organization_name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl focus:border-indigo-500 outline-none text-sm text-white placeholder:text-stone-600 transition-all"
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">First Name</label>
                <input
                  name="first_name"
                  type="text"
                  placeholder="Alice"
                  value={form.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl focus:border-indigo-500 outline-none text-sm text-white placeholder:text-stone-600 transition-all"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Last Name</label>
                <input
                  name="last_name"
                  type="text"
                  placeholder="Smith"
                  value={form.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl focus:border-indigo-500 outline-none text-sm text-white placeholder:text-stone-600 transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Work Email</label>
              <input
                name="email"
                type="email"
                placeholder="alice@novacart.demo"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl focus:border-indigo-500 outline-none text-sm text-white placeholder:text-stone-600 transition-all"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Password</label>
              <input
                name="password"
                type="password"
                placeholder="Min 8 chars (1 upper, 1 lower, 1 digit, 1 special)"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl focus:border-indigo-500 outline-none text-sm text-white placeholder:text-stone-600 transition-all"
                required
                disabled={loading}
              />
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
                  Create Organization
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-stone-800 text-xs text-stone-400">
            Already have a workspace?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-bold ml-1 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}