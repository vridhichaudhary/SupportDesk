// components/AdminSidebar.jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/admin/dashboard", label: "Admin Dashboard", icon: "📊" },
    { href: "/admin/tickets", label: "All Tickets", icon: "🎫" },
    { href: "/admin/agents", label: "Support Agents", icon: "👥" },
    { href: "/admin/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-6">
      <div className="mb-8">
        <div className="text-2xl font-bold text-gray-900">SupportDesk</div>
        <div className="text-sm text-gray-500 mt-1">Admin Portal</div>
      </div>

      <nav className="space-y-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t pt-6">
        <div className="text-xs text-gray-400">Signed in as</div>
        <div className="text-sm font-medium text-gray-800 mt-1">{typeof window !== "undefined" && (() => {
          try {
            const u = localStorage.getItem("user");
            return u ? JSON.parse(u).name : "Admin";
          } catch { return "Admin"; }
        })()}</div>
      </div>
    </aside>
  );
}
