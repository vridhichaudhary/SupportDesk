import UserSidebar from "@/components/UserSidebar";

export default function UserLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <UserSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}