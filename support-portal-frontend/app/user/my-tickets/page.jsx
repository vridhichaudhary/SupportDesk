"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CreateTicketModal from "@/components/CreateTicketModal";

export default function MyTicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState([]);

  async function fetchTickets() {
    const token = localStorage.getItem("token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tickets?mine=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTickets(data.items || []);
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return router.push("/login");

    fetchTickets();
    setLoading(false);
  }, []);

  function handleTicketCreated() {
    fetchTickets();
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <button
          onClick={() => setOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          + Create Ticket
        </button>
      </div>

      {open && (
        <CreateTicketModal
          onClose={() => setOpen(false)}
          onCreated={handleTicketCreated}
        />
      )}

      <div className="bg-white p-6 rounded-lg border">
        {tickets.length === 0 ? (
          <p className="text-gray-500">No tickets found. Create your first ticket!</p>
        ) : (
          tickets.map((t) => (
            <div key={t._id} className="border p-3 rounded mb-2">
              <div className="font-semibold">{t.title}</div>
              <div className="text-sm text-gray-500">Priority: {t.priority}</div>
              <div className="text-sm text-gray-400">Created: {new Date(t.createdAt).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
