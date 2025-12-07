export default function UserSidebar({ isOpen, closeSidebar }) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/user/dashboard", label: "Dashboard" },
    { href: "/user/my-tickets", label: "My Tickets" },
  ];

  return (
    <>
      {isOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
        />
      )}

      <aside
        className={`
          fixed md:static z-30 bg-white border-r min-h-screen p-6 w-64
          transform transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900">SupportDesk</h2>
          <p className="text-sm text-gray-500 mt-1">User Portal</p>
        </div>

        <nav className="space-y-2">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  active
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
