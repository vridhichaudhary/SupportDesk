"use client";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      setMessage("⚠️ Please ensure all fields are correctly populated.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("⚠️ Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      };

      const res = await axiosInstance.post("/user/register", payload);

      if (res.status === 201) {
        setMessage("✅ Account created successfully!");
        setTimeout(() => router.push("/login"), 1200);
      }
    } catch (err) {
      console.error("Signup error:", err.response?.data?.message || err.message || "Failed to create account.", err);
      setMessage("⚠️ " + (err.response?.data?.message || "Failed to create account."));
    } finally {
      setIsLoading(false);
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
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Create Account</h2>
            <p className="text-stone-500 text-sm font-medium mt-1">Join the SupportDesk network</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            <div className="space-y-3">
              <input
                name="name"
                type="text"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-accent-600 outline-none transition-all text-sm font-medium text-stone-900 placeholder:text-stone-400"
                required
                disabled={isLoading}
              />
              <input
                name="email"
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-accent-600 outline-none transition-all text-sm font-medium text-stone-900 placeholder:text-stone-400"
                required
                disabled={isLoading}
              />
              <input
                name="password"
                type="password"
                placeholder="Password (min 6 chars)"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-accent-600 outline-none transition-all text-sm font-medium text-stone-900 placeholder:text-stone-400"
                required
                disabled={isLoading}
              />
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-accent-600 outline-none transition-all text-sm font-medium text-stone-900 placeholder:text-stone-400"
                required
                disabled={isLoading}
              />
              <div className="pt-2">
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm font-medium text-stone-900 focus:bg-white focus:border-accent-600 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="user">Standard User</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 rounded-lg text-xs font-bold border ${message.includes('✅')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-stone-900 text-white py-3 rounded-lg font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Register Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="p-6 text-center border-t border-stone-100 bg-stone-50">
            <p className="text-xs font-medium text-stone-500">
              Already a member?{" "}
              <Link href="/login" className="text-accent-600 hover:text-accent-700 font-bold ml-1 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}