"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Ticket, LogOut, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminSidebar({ onNavigate }) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/admin/dashboard", label: "Platform Overview", icon: LayoutDashboard },
    { href: "/admin/tickets", label: "Global Tickets", icon: Ticket },
    { href: "/admin/agents", label: "Agent Directory", icon: Users },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <aside className={`${onNavigate ? "block" : "hidden md:flex"} w-64 bg-white border-r border-stone-200 min-h-screen flex-col font-sans`}>
      <div className="p-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="text-accent-600 w-6 h-6" />
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">SupportDesk</h2>
        </div>
        <div className="text-[10px] font-bold text-accent-700 uppercase tracking-widest ml-1 bg-accent-50 px-2 py-0.5 rounded-full inline-block border border-accent-100">
          Admin Terminal
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onNavigate && onNavigate()}
              className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm font-semibold ${isActive
                ? "bg-stone-50 text-accent-600 border border-stone-100 shadow-sm"
                : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                }`}
            >
              <Icon className={`w-4 h-4 transition-all ${isActive ? "text-accent-600" : "text-stone-400 group-hover:text-stone-600"}`} />
              <span>{link.label}</span>
              {isActive && (
                <div className="ml-auto w-1 h-3 rounded-full bg-accent-600" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 mt-auto border-t border-stone-100">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center border border-stone-200">
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Operator</div>
            <div className="text-xs font-bold text-stone-900 truncate">
              {typeof window !== "undefined" && (() => {
                try {
                  const u = localStorage.getItem("user");
                  return u ? JSON.parse(u).name : "Administrator";
                } catch { return "Administrator"; }
              })()}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-stone-400 py-2 rounded-xl text-xs font-bold group hover:text-rose-600 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Terminate Terminal
        </button>
      </div>
    </aside>
  );
}
