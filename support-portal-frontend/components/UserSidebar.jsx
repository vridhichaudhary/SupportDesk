"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function UserSidebar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/user/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/user/my-tickets", label: "My Tickets", icon: "🎫" },
  ];

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-6">
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
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
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