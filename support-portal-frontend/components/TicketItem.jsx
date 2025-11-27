export default function TicketItem({ ticket }) {
  const statusColor = ticket.status === "open" ? "bg-blue-100 text-blue-800" :
                      ticket.status === "in-progress" ? "bg-yellow-100 text-yellow-800" :
                      "bg-green-100 text-green-800";

  return (
    <div className="mb-4 p-4 border rounded shadow-sm bg-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{ticket.ticketId}</div>
          <div className="text-lg font-semibold">{ticket.title}</div>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`px-3 py-1 rounded-full text-xs ${statusColor}`}>{ticket.status}</span>
          <span className="px-3 py-1 rounded-full text-xs bg-gray-100">{ticket.priority}</span>
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-600">
        <div>Category: {ticket.category}</div>
        <div className="text-xs text-gray-400">Created: {new Date(ticket.createdAt).toLocaleString()}</div>
      </div>
    </div>
  );
}
