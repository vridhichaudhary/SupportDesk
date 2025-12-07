// app/admin/layoutClient.jsx
"use client";

import { useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import AdminHeader from "../../components/AdminHeader";

export default function AdminLayoutClient({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">

      <div className="md:hidden flex justify-between items-center w-full border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            className="text-gray-700"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="font-semibold">SupportDesk</div>
        </div>

        <div>
          <AdminHeader />
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="bg-black/40 absolute inset-0" />
          <div className="relative z-50 w-64 bg-white h-full p-4" onClick={(e) => e.stopPropagation()}>
            <AdminSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="hidden md:block w-64 border-r bg-white">
        <AdminSidebar />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="hidden md:block w-full bg-white border-b">
          <AdminHeader />
        </div>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
