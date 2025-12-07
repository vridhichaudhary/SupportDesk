"use client";

import { useState } from "react";
import UserSidebar from "@/components/UserSidebar";

export default function UserLayout({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">

      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-lg border shadow"
        onClick={() => setOpen(true)}
      >
        ☰
      </button>

      <UserSidebar isOpen={open} onClose={() => setOpen(false)} />

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
