import PortalHeader from "@/components/portal/PortalHeader";

export const metadata = {
  title: "SupportDesk - Customer Portal",
  description: "Customer portal for SupportDesk",
};

export default function PortalLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <PortalHeader />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
