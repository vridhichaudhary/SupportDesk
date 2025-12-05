"use client";

import { useRouter } from "next/navigation";

export default function AdminHeader() {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    router.push("/login");
  }

  return (
    <header className="w-full bg-white border-b px-6 py-4 flex justify-end">
      <button
        onClick={handleLogout}
        className="px-4 py-2 border rounded-lg hover:bg-gray-100"
      >
        Logout
      </button>
    </header>
  );
}
