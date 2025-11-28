"use client";
import UserSidebar from "@/components/UserSidebar";

export default function UserLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex bg-white">
        <UserSidebar />
        <main className="flex-1 p-8">{children}</main>
      </body>
    </html>
  );
}
