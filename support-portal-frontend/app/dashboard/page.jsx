"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userJSON = localStorage.getItem("user");
    
    if (!token || !userJSON) {
      router.push("/login");
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userJSON);
      setUser(parsedUser);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">Welcome back, {user?.name || "User"}</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition font-medium"
            >
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-600 uppercase mb-2">Email</h3>
              <p className="text-gray-900 font-medium">{user?.email}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-xl border border-green-100">
              <h3 className="text-sm font-semibold text-green-600 uppercase mb-2">Role</h3>
              <p className="text-gray-900 font-medium capitalize">{user?.role}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Quick Actions</h2>
            <p className="text-gray-600 mb-4">
              {user?.role === "admin" 
                ? "As an admin, you have access to all system features and user management."
                : "Welcome to your personal dashboard. You can manage your support tickets here."}
            </p>
            <div className="flex gap-3">
              {user?.role === "admin" && (
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                  Manage Users
                </button>
              )}
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition">
                View Tickets
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}