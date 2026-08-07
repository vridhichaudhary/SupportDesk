"use client";

import { useEffect, useState } from "react";
import { User, Shield, Briefcase, Mail, CheckCircle2, Lock } from "lucide-react";
import api from "@/utils/axiosInstance";

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [meRes, sessRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/auth/sessions").catch(() => ({ data: [] }))
      ]);
      setProfile(meRes.data);
      setSessions(sessRes.data?.data || sessRes.data || []);
    } catch (e) {
      console.error(e);
      setError("Failed to load account settings.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 min-h-[500px]">
        <div className="w-8 h-8 border-2 border-accent-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 min-h-[500px] text-center">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-stone-900 mb-2">Error Loading Settings</h3>
        <p className="text-stone-500 max-w-md mb-6">{error}</p>
        <button
          onClick={fetchData}
          className="px-6 py-2.5 bg-white border border-stone-200 text-stone-700 font-bold text-sm rounded-xl hover:bg-stone-50 transition-colors shadow-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Account Settings</h1>
        <p className="text-stone-500 text-sm mt-1">Manage your profile, security preferences, and active sessions.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Profile Card */}
        <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center gap-4 bg-stone-50/50">
            <div className="w-16 h-16 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 font-bold text-2xl border-4 border-white shadow-sm">
              {profile?.name?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">{profile?.name}</h2>
              <div className="flex items-center gap-2 text-stone-500 text-sm mt-1">
                <Shield className="w-3.5 h-3.5 text-accent-500" />
                <span className="capitalize">{profile?.role || "Staff"}</span>
              </div>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                <Mail className="w-4 h-4 text-stone-400" />
                Email Address
              </label>
              <div className="text-stone-900 font-medium px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                {profile?.email}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                <Briefcase className="w-4 h-4 text-stone-400" />
                Organization
              </label>
              <div className="text-stone-900 font-medium px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                {profile?.org_id || "Main Org"}
              </div>
            </div>
          </div>
        </section>

        {/* Security / Sessions Card */}
        <section className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex items-center gap-3">
            <Lock className="w-5 h-5 text-stone-500" />
            <h3 className="font-bold text-stone-900">Security & Sessions</h3>
          </div>
          
          <div className="p-6 space-y-4">
            <h4 className="text-sm font-bold text-stone-900">Active Devices</h4>
            <p className="text-sm text-stone-500 mb-4">You are currently logged in on the following devices.</p>
            
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session, i) => (
                  <div key={session.id || i} className="flex items-center justify-between p-4 rounded-xl border border-stone-100 bg-stone-50">
                    <div>
                      <div className="font-medium text-stone-900 flex items-center gap-2 text-sm">
                        {session.device_name || "Unknown Device"}
                        {i === 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 mt-1">IP: {session.ip_address || "N/A"} • Last active: {session.last_active || "Just now"}</div>
                    </div>
                    {i !== 0 && (
                      <button className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-colors">
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-stone-100 bg-stone-50 text-sm text-stone-500 text-center">
                Session tracking is not active.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
