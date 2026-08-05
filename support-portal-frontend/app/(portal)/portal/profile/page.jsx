"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, ShieldCheck, Loader2, Save, Building } from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";
import PortalGuard from "@/components/portal/PortalGuard";

export default function PortalProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axiosInstance.get("/auth/me");
        if (res.data?.data) {
          const userData = res.data.data;
          setUser(userData);
          setForm({
            first_name: userData.first_name || "",
            last_name: userData.last_name || "",
            email: userData.email || "",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    
    try {
      // In a real implementation we would call a user update endpoint here
      // For now, simulate the save delay
      await new Promise(r => setTimeout(r, 1000));
      
      const updatedUser = { ...user, ...form, display_name: `${form.first_name} ${form.last_name}` };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      setMessage("✅ Profile updated successfully.");
    } catch (err) {
      setMessage("❌ Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalGuard>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account information and preferences.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-sky-500 to-indigo-500 text-white rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-inner">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{user?.display_name}</h2>
                <p className="text-sm text-gray-500 mb-4">{user?.email}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Customer Account
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Personal Information</h3>
                  <p className="text-sm text-gray-500 mb-4">Update your basic profile information.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
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
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={form.last_name}
                      onChange={handleChange}
                      className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all sm:text-sm bg-gray-50 focus:bg-white outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      disabled
                      className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 sm:text-sm outline-none cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">To change your email address, please contact support.</p>
                </div>

                {message && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className={`p-3 text-sm rounded-lg ${message.includes("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                  >
                    {message}
                  </motion.div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-50">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalGuard>
  );
}
