"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminSidebar() {
  const path = usePathname();

  return (
    <aside className="w-64 bg-black text-white min-h-screen p-6">
      <h2 className="text-xl font-bold mb-6">Admin Portal</h2>

      <nav className="space-y-3">
        <Link href="/admin/dashboard" className={path === "/admin/dashboard" ? "font-bold text-green-400" : ""}>Dashboard</Link>
        <Link href="/admin/tickets" className={path === "/admin/tickets" ? "font-bold text-green-400" : ""}>Tickets</Link>
        <Link href="/admin/users" className={path === "/admin/users" ? "font-bold text-green-400" : ""}>Users</Link>
      </nav>
    </aside>
  );
}
