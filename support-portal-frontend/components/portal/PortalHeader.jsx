"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, User, Menu, X, LayoutDashboard, Ticket, BookOpen, Bot } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PortalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (err) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/portal/login");
  };

  const navLinks = [
    { name: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
    { name: "My Tickets", href: "/portal/tickets", icon: Ticket },
    { name: "Knowledge Base", href: "/portal/knowledge", icon: BookOpen },
    { name: "AI Assistant", href: "/portal/ai", icon: Bot },
  ];

  const isActive = (href) => {
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/portal" className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-sky-500 to-indigo-500 text-white p-1.5 rounded-lg">
                <Ticket className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-gray-900 tracking-tight">
                SupportDesk
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden md:flex space-x-8">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                      active ? "text-sky-600 border-b-2 border-sky-600 pt-0.5" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <link.icon className={`w-4 h-4 ${active ? "text-sky-600" : "text-gray-400"}`} />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/portal/tickets/new"
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-sky-600/20"
                >
                  Submit Request
                </Link>
                <div className="h-6 w-px bg-gray-200"></div>
                <div className="flex items-center gap-2 group relative">
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 hidden group-hover:block transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                    <div className="px-4 py-2 border-b border-gray-50 mb-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.display_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Link href="/portal/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User className="w-4 h-4 text-gray-400" />
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/portal/login"
                  className="text-gray-600 hover:text-gray-900 font-medium text-sm px-3 py-2"
                >
                  Log in
                </Link>
                <Link
                  href="/portal/signup"
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-100 bg-white"
          >
            <div className="px-4 py-3 space-y-1">
              {user ? (
                <>
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-sky-600"
                    >
                      <link.icon className="w-5 h-5 text-gray-400" />
                      {link.name}
                    </Link>
                  ))}
                  <div className="h-px bg-gray-100 my-2"></div>
                  <Link
                    href="/portal/tickets/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-sky-600"
                  >
                    Submit Request
                  </Link>
                  <Link
                    href="/portal/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-gray-700"
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-base font-medium text-red-600"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="space-y-2 py-2">
                  <Link
                    href="/portal/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-2 border border-gray-200 rounded-lg text-base font-medium text-gray-700 bg-white"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/portal/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-2 rounded-lg text-base font-medium text-white bg-sky-600"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
