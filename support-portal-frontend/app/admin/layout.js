"use client";

import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { useEffect, useState } from "react";

export const metadata = {
  title: "Admin - SupportDesk",
};

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("admin");
    if (!stored) {
      router.push("/admin/login"); 
    } else {
      setAdmin(JSON.parse(stored));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin");
    localStorage.removeItem("token");
    router.push("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">

        <header className="w-full bg-white border-b px-8 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-700">Admin Portal</h2>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition text-gray-700"
          >
            Logout
          </button>
        </header>

        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
