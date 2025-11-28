"use client";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 p-8">{children}</main>
      </body>
    </html>
  );
}
