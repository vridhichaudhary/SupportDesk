"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const path = usePathname();
  const navItem = (href, label, icon = null) => (
    <Link href={href}>
      <a className={`flex items-center gap-3 px-4 py-2 rounded-lg ${path === href ? "bg-green-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}>
        {icon}
        <span className="font-medium">{label}</span>
      </a>
    </Link>
  );

  return (
    <aside className="w-64 bg-black text-gray-300 min-h-screen p-6">
      <div className="mb-10">
        <div className="text-xl font-bold text-white mb-1">SupportHub</div>
        <div className="text-sm text-gray-400">Support Portal</div>
      </div>

      <nav className="space-y-2">
        {navItem("/dashboard", "Dashboard")}
        {navItem("/my-tickets", "My Tickets")}
        {navItem("/chat", "Live Chat")}
      </nav>
    </aside>
  );
}
