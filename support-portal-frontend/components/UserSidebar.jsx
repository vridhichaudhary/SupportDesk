"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function UserSidebar({ isOpen, onClose }) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/user/dashboard", label: "Dashboard" },
    { href: "/user/my-tickets", label: "My Tickets" },
  ];

  return (
    <aside
      className={`
        fixed md:static top-0 left-0 h-full w-64 bg-white border-r p-6 z-40
        transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
    >
      <button
        className="md:hidden mb-4 text-gray-600"
        onClick={onClose}
      >
        ✕ Close
      </button>

      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900">SupportDesk</h2>
        <p className="text-sm text-gray-500 mt-1">User Portal</p>
      </div>

      <nav className="space-y-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
