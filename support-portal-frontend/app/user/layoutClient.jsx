"use client";

import { useState } from "react";
import UserSidebar from "@/components/UserSidebar";

export default function UserLayoutClient({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">

      <div className="md:hidden flex justify-between items-center p-4 border-b bg-white">
        <h1 className="text-xl font-bold">SupportDesk</h1>

        <button
          onClick={() => setOpen(!open)}
          className="px-3 py-2 border rounded-lg"
        >
          ☰
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-64 bg-white h-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <UserSidebar />
          </div>
        </div>
      )}

      <div className="hidden md:block w-64 border-r bg-white">
        <UserSidebar />
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
