"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Ticket, LogOut, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function UserSidebar({ onNavigate }) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/user/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/user/my-tickets", label: "My Tickets", icon: Ticket },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 bg-white min-h-screen flex flex-col border-r border-stone-200 font-sans">
      <div className="p-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="text-accent-600 w-6 h-6" />
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">SupportDesk</h2>
        </div>
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Member Portal</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onNavigate && onNavigate()}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm font-semibold ${isActive
                ? "bg-stone-50 text-accent-600 border border-stone-100 shadow-sm"
                : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-accent-600" : "text-stone-400 group-hover:text-stone-600"}`} />
              <span>{link.label}</span>
              {isActive && (
                <div className="ml-auto w-1 h-1 rounded-full bg-accent-600" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 mt-auto border-t border-stone-100">
        <div className="bg-stone-50 rounded-xl p-3 mb-4 border border-stone-100">
          <div className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">Authenticated</div>
          <div className="text-xs font-bold text-stone-900 truncate">
            {typeof window !== "undefined" && (() => {
              try {
                const u = localStorage.getItem("user");
                return u ? JSON.parse(u).name : "Support User";
              } catch { return "Support User"; }
            })()}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-stone-400 py-2 rounded-xl text-xs font-bold group hover:text-rose-600 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

