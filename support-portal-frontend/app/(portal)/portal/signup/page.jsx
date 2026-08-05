"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Building, Mail, Lock, User, Ticket } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";

export default function PortalSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    company: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setMessage("⚠️ Please complete all required fields");
      return;
    }

    setLoading(true);

    try {
      const res = await axiosInstance.post("/auth/customer-signup", {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        company: form.company.trim() || undefined,
      });

      const tokenData = res.data?.data;
      if (tokenData?.access_token) {
        localStorage.setItem("token", tokenData.access_token);
        if (tokenData.refresh_token) {
          localStorage.setItem("refresh_token", tokenData.refresh_token);
        }
      }

      // Fetch user
      const meRes = await axiosInstance.get("/auth/me");
      if (meRes.data?.data) {
        localStorage.setItem("user", JSON.stringify(meRes.data.data));
        router.push("/portal/dashboard");
      } else {
        throw new Error("Failed to get user details");
      }
    } catch (error) {
      const msg = error.response?.data?.error?.message || "Signup failed. Please try again.";
      setMessage("❌ " + msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-sky-100/50 p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-sky-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-500">Sign up to submit and track your support tickets</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all sm:text-sm bg-gray-50 focus:bg-white outline-none"
                    placeholder="Jane"
                    disabled={loading}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all sm:text-sm bg-gray-50 focus:bg-white outline-none"
                  placeholder="Doe"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all sm:text-sm bg-gray-50 focus:bg-white outline-none"
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all sm:text-sm bg-gray-50 focus:bg-white outline-none"
                  placeholder="Acme Corp"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all sm:text-sm bg-gray-50 focus:bg-white outline-none"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3 bg-red-50 text-red-700 text-sm rounded-lg"
              >
                {message}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/portal/login" className="font-medium text-sky-600 hover:text-sky-500">
              Log in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
