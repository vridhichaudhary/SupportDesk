"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MyTicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
          + Create Ticket
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <p className="text-gray-500">No tickets found. Create your first ticket!</p>
      </div>
    </div>
  );
}