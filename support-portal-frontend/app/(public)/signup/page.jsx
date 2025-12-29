"use client";
import { useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, UserCheck, ArrowRight, Loader2 } from "lucide-react";

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

    if (!form.name.trim()) {
      setMessage("⚠️ Name is required");
      return;
    }

    if (!form.email.trim()) {
      setMessage("⚠️ Email is required");
      return;
    }

    if (form.password.length < 6) {
      setMessage("⚠️ Password must be at least 6 characters");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("⚠️ Passwords do not match");
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

        setForm({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "user",
        });

        setTimeout(() => router.push("/login"), 1200);
      }
    } catch (err) {
      console.error("Signup error:", err);
      let errorMessage = "Failed to create account. Try again.";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      setMessage("⚠️ " + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 p-8 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[140%] rounded-full bg-indigo-500 blur-3xl"></div>
            </div>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm"
            >
              <UserCheck className="w-8 h-8 text-indigo-400" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-2">Create Account</h2>
            <p className="text-slate-400">Join the premium support network</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-accent-600 transition-colors" />
                <input
                  name="name"
                  type="text"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-accent-600 focus:border-transparent outline-none transition-all text-slate-700 placeholder:text-slate-400"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="relative group">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-accent-600 transition-colors" />
                <input
                  name="email"
                  type="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-accent-600 focus:border-transparent outline-none transition-all text-slate-700 placeholder:text-slate-400"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-accent-600 transition-colors" />
                <input
                  name="password"
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-accent-600 focus:border-transparent outline-none transition-all text-slate-700 placeholder:text-slate-400"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-accent-600 transition-colors" />
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-accent-600 focus:border-transparent outline-none transition-all text-slate-700 placeholder:text-slate-400"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  Access Level
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:ring-2 focus:ring-accent-600 focus:border-transparent outline-none transition-all appearance-none"
                >
                  <option value="user">Standard User</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-3 rounded-xl text-sm font-medium border ${message.includes('✅')
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
              className="group w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-accent-600 hover:text-accent-700 font-bold ml-1 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}