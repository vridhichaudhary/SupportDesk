import UserSidebar from "@/components/UserSidebar";
import "../globals.css";

export default function UserLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex bg-gray-50">
        <UserSidebar />
        <main className="flex-1 p-6">{children}</main>
      </body>
    </html>
  );
}
