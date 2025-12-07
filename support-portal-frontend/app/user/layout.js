import UserSidebar from "@/components/UserSidebar";

export default function UserLayout({ children }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">

      <div className="w-full md:w-64 border-r bg-white">
        <UserSidebar />
      </div>

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {children}
      </main>

    </div>
  );
}
