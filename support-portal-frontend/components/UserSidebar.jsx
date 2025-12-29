"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Ticket, LogOut, ChevronRight } from "lucide-react";
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
    <aside className="w-72 bg-slate-900 min-h-screen flex flex-col border-r border-slate-800">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-accent-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-600/20">
            <Ticket className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter italic">SupportDesk</h2>
        </div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Premium Portal</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onNavigate && onNavigate()}
              className={`group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${isActive
                  ? "bg-accent-600 text-white shadow-lg shadow-accent-600/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-white" : "text-slate-500 group-hover:text-accent-400"}`} />
                <span className="font-semibold tracking-wide">{link.label}</span>
              </div>
              {isActive && (
                <motion.div layoutId="active-nav" className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-700/50">
          <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">User</div>
          <div className="text-sm font-bold text-white truncate">
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
          className="w-full flex items-center justify-center gap-2 bg-slate-800 text-slate-400 py-3 rounded-2xl font-bold hover:bg-rose-500/10 hover:text-rose-400 transition-all border border-slate-700"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

