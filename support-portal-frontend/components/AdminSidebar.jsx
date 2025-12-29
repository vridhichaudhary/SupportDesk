"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Ticket, LogOut, ShieldCheck, Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminSidebar({ onNavigate }) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/admin/dashboard", label: "Admin Hub", icon: LayoutDashboard },
    { href: "/admin/tickets", label: "Global Tickets", icon: Ticket },
    { href: "/admin/agents", label: "Support Agents", icon: Users },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <aside className={`${onNavigate ? "block" : "hidden md:flex"} w-72 bg-slate-900 border-r border-slate-800 min-h-screen flex-col`}>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter italic">SupportDesk</h2>
        </div>
        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] ml-1 bg-indigo-500/10 px-2 py-0.5 rounded-full inline-block">
          System Admin
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 mt-4">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onNavigate && onNavigate()}
              className={`group flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${isActive
                  ? "bg-white text-slate-900 shadow-xl shadow-black/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
            >
              <Icon className={`w-5 h-5 transition-all ${isActive ? "text-indigo-600 scale-110" : "text-slate-500 group-hover:text-indigo-400"}`} />
              <span className={`font-bold tracking-tight ${isActive ? "text-slate-900" : ""}`}>{link.label}</span>
              {isActive && (
                <motion.div layoutId="active-indicator" className="ml-auto w-1 h-4 rounded-full bg-indigo-600" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 mt-auto border-t border-slate-800">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Operator</div>
            <div className="text-sm font-bold text-white truncate">
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
          className="w-full flex items-center justify-center gap-2 bg-slate-800/50 text-slate-300 py-3.5 rounded-2xl font-bold hover:bg-rose-500 hover:text-white transition-all border border-slate-700/50 shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          Terminate Session
        </button>
      </div>
    </aside>
  );
}
