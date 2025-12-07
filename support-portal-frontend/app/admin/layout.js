"use client";

import { useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import AdminHeader from "../../components/AdminHeader";

export const metadata = {
  title: "Admin - SupportDesk",
};

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">

      <AdminSidebar
        isOpen={sidebarOpen}
        closeSidebar={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col">

        <div className="w-full bg-white border-b flex items-center px-4 py-4">

          <button
            className="md:hidden mr-4 text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1">
            <AdminHeader />
          </div>
        </div>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
