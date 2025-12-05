import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminHeader from "../../components/admin/AdminHeader";

export const metadata = {
  title: "Admin - SupportDesk",
};

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">

        <AdminHeader />

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
