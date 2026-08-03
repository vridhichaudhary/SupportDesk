"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User,
  ShieldCheck,
  Camera,
  Lock,
  Smartphone,
  LogOut,
  Trash2,
  Save,
  CheckCircle2,
  Loader2,
  Building,
  Mail,
  Clock,
  Globe,
  Palette,
  ArrowLeft,
} from "lucide-react";
import axiosInstance from "@/utils/axiosInstance";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    display_name: "",
    job_title: "",
    bio: "",
    timezone: "UTC",
    preferred_language: "en",
    theme_preference: "system",
  });

  // Password Form
  const [passForm, setPassForm] = useState({ current_password: "", new_password: "" });
  const [passMsg, setPassMsg] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const meRes = await axiosInstance.get("/auth/me");
      const userData = meRes.data?.data;
      setUser(userData);
      if (userData) {
        setProfileForm({
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          display_name: userData.display_name || "",
          job_title: userData.job_title || "",
          bio: userData.bio || "",
          timezone: userData.timezone || "UTC",
          preferred_language: userData.preferred_language || "en",
          theme_preference: userData.theme_preference || "system",
        });
      }

      // Fetch sessions
      const sessRes = await axiosInstance.get("/auth/sessions");
      if (sessRes.data?.data) {
        setSessions(sessRes.data.data);
      }
    } catch (e) {
      console.error("Failed to load user profile", e);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await axiosInstance.patch("/users/me", profileForm);
      setUser(res.data?.data);
      localStorage.setItem("user", JSON.stringify(res.data?.data));
      setMsg("✅ Profile updated successfully!");
    } catch (err) {
      setMsg("⚠️ " + (err.response?.data?.error?.message || "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axiosInstance.post("/users/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(res.data?.data);
      setMsg("✅ Avatar updated!");
    } catch (err) {
      setMsg("⚠️ " + (err.response?.data?.error?.message || "Avatar upload failed"));
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassMsg("");
    try {
      await axiosInstance.post("/auth/change-password", passForm);
      setPassMsg("✅ Password changed successfully!");
      setPassForm({ current_password: "", new_password: "" });
    } catch (err) {
      setPassMsg("⚠️ " + (err.response?.data?.error?.message || "Password change failed"));
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await axiosInstance.post("/auth/sessions/revoke-all");
      fetchData();
      setMsg("✅ All device sessions revoked");
    } catch (e) {
      setMsg("⚠️ Failed to revoke sessions");
    }
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (e) {}
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure you want to deactivate your account?")) {
      try {
        await axiosInstance.delete("/users/me");
        handleLogout();
      } catch (e) {
        setMsg("⚠️ Failed to deactivate account");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans p-6 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-stone-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Account & Profile Settings</h1>
              <p className="text-xs text-stone-400 font-mono mt-0.5">
                Organization Tenant ID: {user?.organization_id}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Global Notification Banner */}
        {msg && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold border ${
              msg.includes("✅")
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {msg}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-8 shadow-xl">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-500/30 overflow-hidden flex items-center justify-center text-indigo-300 font-bold text-2xl">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.first_name?.[0] || "U"}</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full cursor-pointer shadow-lg transition-all">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">{user?.display_name || user?.email}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-stone-400 font-mono">
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md font-bold">
                  {user?.role}
                </span>
                <span>{user?.email}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4 pt-4 border-t border-stone-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">First Name</label>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Last Name</label>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Job Title</label>
              <input
                type="text"
                placeholder="e.g. Lead Support Engineer"
                value={profileForm.job_title}
                onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Bio</label>
              <textarea
                rows={3}
                placeholder="Short bio or description..."
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Timezone</label>
                <select
                  value={profileForm.timezone}
                  onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white outline-none"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">EST (New York)</option>
                  <option value="Europe/London">GMT (London)</option>
                  <option value="Asia/Kolkata">IST (Kolkata)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Language</label>
                <select
                  value={profileForm.preferred_language}
                  onChange={(e) => setProfileForm({ ...profileForm, preferred_language: e.target.value })}
                  className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white outline-none"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Theme</label>
                <select
                  value={profileForm.theme_preference}
                  onChange={(e) => setProfileForm({ ...profileForm, theme_preference: e.target.value })}
                  className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white outline-none"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-4 shadow-xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-400" />
            Security & Change Password
          </h3>

          {passMsg && (
            <div className="p-3 rounded-xl text-xs font-bold border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
              {passMsg}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">Current Password</label>
              <input
                type="password"
                value={passForm.current_password}
                onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:border-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">New Password</label>
              <input
                type="password"
                value={passForm.new_password}
                onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:border-indigo-500 outline-none"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>

        {/* Device Sessions Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-400" />
              Active Device Sessions ({sessions.length})
            </h3>
            {sessions.length > 0 && (
              <button
                onClick={handleRevokeAllSessions}
                className="text-xs font-bold text-rose-400 hover:underline"
              >
                Revoke All Sessions
              </button>
            )}
          </div>

          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="p-4 bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{s.device_info || "Web Browser"}</p>
                  <p className="text-stone-500 font-mono">Last accessed: {new Date(s.last_accessed_at).toLocaleString()}</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-md font-bold">Active</span>
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-3xl p-8 space-y-4 shadow-xl">
          <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </h3>
          <p className="text-xs text-stone-400">
            Deactivating your account soft-deletes your user profile. You can reactivate by contacting your workspace owner.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            Deactivate Account
          </button>
        </div>
      </div>
    </div>
  );
}
