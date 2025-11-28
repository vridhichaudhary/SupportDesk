"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function UserSidebar() {
  const path = usePathname();

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-6">
      <h2 className="text-xl font-bold mb-6">User Portal</h2>

      <nav className="space-y-2">
        <Link href="/dashboard" className={path === "/dashboard" ? "font-bold text-blue-600" : ""}>Dashboard</Link>
        <Link href="/my-tickets" className={path === "/my-tickets" ? "font-bold text-blue-600" : ""}>My Tickets</Link>
      </nav>
    </aside>
  );
}
