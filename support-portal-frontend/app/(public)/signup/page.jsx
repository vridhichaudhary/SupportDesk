"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Building, ArrowRight, Loader2, Mail, Lock, User, Briefcase, Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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

      setMessage("✅ Organization & Administrator account created!");
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 800);
    } catch (err) {
      const errDetail =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Signup failed. Please verify your details.";
      setMessage("⚠️ " + errDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-lg"
    >
      <div className="bg-white border border-stone-200/80 rounded-3xl p-8 sm:p-10 shadow-xl shadow-sky-100/50">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-100 rounded-full text-sky-700 text-[11px] font-bold uppercase tracking-wider mb-4">
            <Building className="w-3.5 h-3.5 text-sky-600" />
            Enterprise Staff Setup
          </div>

          <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/25 text-white">
            <Briefcase className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Create Workspace</h1>
          <p className="text-stone-500 text-xs font-medium mt-1">
            Set up your organization tenant & owner administrator account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Organization Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Building className="w-4 h-4" />
              </div>
              <input
                name="organization_name"
                type="text"
                placeholder="e.g. Acme Cloud Corp"
                value={form.organization_name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50/70 hover:bg-white focus:bg-white border border-stone-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 rounded-xl outline-none text-sm text-stone-900 placeholder:text-stone-400 transition-all font-medium"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Industry
            </label>
            <select
              name="industry"
              value={form.industry}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-stone-50/70 hover:bg-white focus:bg-white border border-stone-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 rounded-xl outline-none text-sm text-stone-900 transition-all font-medium cursor-pointer"
              disabled={loading}
            >
              <option value="Technology">Technology & SaaS</option>
              <option value="Ecommerce">E-Commerce & Retail</option>
              <option value="Healthcare">Healthcare & BioTech</option>
              <option value="Finance">Financial Services</option>
              <option value="Education">Education & EdTech</option>
              <option value="Other">Other Industry</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                First Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  name="first_name"
                  type="text"
                  placeholder="Jane"
                  value={form.first_name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50/70 hover:bg-white focus:bg-white border border-stone-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 rounded-xl outline-none text-sm text-stone-900 placeholder:text-stone-400 transition-all font-medium"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Last Name
              </label>
              <input
                name="last_name"
                type="text"
                placeholder="Doe"
                value={form.last_name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-50/70 hover:bg-white focus:bg-white border border-stone-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 rounded-xl outline-none text-sm text-stone-900 placeholder:text-stone-400 transition-all font-medium"
                required
                disabled={loading}
              />
            </div>
          </div>

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
                placeholder="admin@company.com"
                value={form.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50/70 hover:bg-white focus:bg-white border border-stone-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 rounded-xl outline-none text-sm text-stone-900 placeholder:text-stone-400 transition-all font-medium"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 chars (1 upper, 1 lower, 1 digit, 1 symbol)"
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
            <p className="text-[11px] text-stone-500 mt-1">
              Must be at least 8 characters with uppercase, lowercase, number, and special character.
            </p>
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
                Creating Workspace...
              </>
            ) : (
              <>
                Create Workspace
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-stone-200 space-y-2 text-xs text-stone-500">
          <div>
            Already have a workspace?{" "}
            <Link href="/login" className="text-sky-600 hover:text-sky-700 font-bold transition-colors">
              Sign in
            </Link>
          </div>
          <div>
            Need customer portal account?{" "}
            <Link href="/portal/signup" className="text-stone-700 hover:text-stone-900 font-bold underline transition-colors">
              Customer Registration
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}