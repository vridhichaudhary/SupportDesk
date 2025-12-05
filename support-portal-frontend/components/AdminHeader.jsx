"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminHeader() {
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
    <header className="w-full bg-white border-b px-8 py-4 flex justify-between items-center">
      <h2 className="text-xl font-semibold text-gray-700">Admin Portal</h2>

      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition text-gray-700"
      >
        Logout
      </button>
    </header>
  );
}
