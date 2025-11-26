"use client";
import TicketItem from "./TicketItem";

export default function TicketList({ tickets = [] }) {
  return (
    <div className="mt-6">
      <div className="text-2xl font-bold text-white mb-2">Recent Tickets</div>
      <div className="text-gray-400 mb-4">Your latest support requests</div>

      <div>
        {tickets.length === 0 ? (
          <div className="text-gray-500">No tickets yet. Create a new ticket.</div>
        ) : (
          tickets.map((t) => <TicketItem key={t._id} ticket={t} />)
        )}
      </div>
    </div>
  );
}
