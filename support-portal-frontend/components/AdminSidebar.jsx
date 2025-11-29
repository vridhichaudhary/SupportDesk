"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/admin/tickets", label: "Tickets", icon: "🎫" },
    { href: "/admin/users", label: "Users", icon: "👥" },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-6">
      <div className="mb-10">
        <h2 className="text-2xl font-bold">SupportDesk</h2>
        <p className="text-sm text-gray-400 mt-1">Admin Portal</p>
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
                  ? "bg-green-600 text-white font-semibold"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}