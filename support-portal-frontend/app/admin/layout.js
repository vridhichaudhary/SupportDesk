import AdminLayoutClient from "./layoutClient";

export const metadata = {
  title: "Admin - SupportDesk",
};

export default function AdminLayout({ children }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
