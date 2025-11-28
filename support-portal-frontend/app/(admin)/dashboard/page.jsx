"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
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
      
      // Redirect non-admin users
      if (parsedUser.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      
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
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Welcome, {user?.name}</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition font-medium"
            >
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
              <h3 className="text-sm font-semibold text-purple-600 uppercase mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-600 uppercase mb-2">Active Tickets</h3>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
            <div className="bg-green-50 p-6 rounded-xl border border-green-100">
              <h3 className="text-sm font-semibold text-green-600 uppercase mb-2">Resolved Today</h3>
              <p className="text-3xl font-bold text-gray-900">0</p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition text-left">
                <div className="font-semibold">Manage Users</div>
                <div className="text-sm text-blue-100">View and manage all users</div>
              </button>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition text-left">
                <div className="font-semibold">System Settings</div>
                <div className="text-sm text-indigo-100">Configure system preferences</div>
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition text-left">
                <div className="font-semibold">View Reports</div>
                <div className="text-sm text-green-100">Analytics and insights</div>
              </button>
              <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg transition text-left">
                <div className="font-semibold">Ticket Management</div>
                <div className="text-sm text-orange-100">Oversee all support tickets</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}