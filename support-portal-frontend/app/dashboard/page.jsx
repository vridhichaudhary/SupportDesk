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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Welcome to your support portal, {user?.name}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition"
            >
              Logout
            </button>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 rounded-xl border bg-indigo-50">
                <h3 className="text-sm font-semibold text-indigo-700 uppercase mb-2">Open Tickets</h3>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-6 rounded-xl border bg-yellow-50">
                <h3 className="text-sm font-semibold text-yellow-700 uppercase mb-2">In Progress</h3>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-6 rounded-xl border bg-green-50">
                <h3 className="text-sm font-semibold text-green-700 uppercase mb-2">Resolved</h3>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
            </div>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Recent Tickets
            </h2>
            <p className="text-gray-600 mb-4">
              Your latest support requests
            </p>

            <p className="text-gray-500">
              No tickets yet. Create a new ticket.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
