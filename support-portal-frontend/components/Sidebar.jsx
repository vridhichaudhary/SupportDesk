"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const path = usePathname();

  const navItem = (href, label) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer
        ${path === href ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"}
      `}
    >
      {label}
    </Link>
  );

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-6">
      <div className="mb-10">
        <div className="text-xl font-bold text-gray-900 mb-1">SupportHub</div>
        <div className="text-sm text-gray-500">User Portal</div>
      </div>

      <nav className="space-y-2">
        {navItem("/dashboard", "Dashboard")}
        {navItem("/my-tickets", "My Tickets")}
      </nav>
    </aside>
  );
}
