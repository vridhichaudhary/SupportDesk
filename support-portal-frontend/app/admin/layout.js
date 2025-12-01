import AdminSidebar from "@/components/AdminSidebar";

export const metadata = {
  title: "Admin - SupportDesk",
};

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
