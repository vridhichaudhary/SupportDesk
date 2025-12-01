export default function TicketItem({ ticket }) {
  const statusClass = ticket.status === "open" ? "bg-blue-100 text-blue-800" :
    ticket.status === "in-progress" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800";

  const priorityClass = ticket.priority?.toLowerCase() === "high" ? "bg-red-100 text-red-800" :
    ticket.priority?.toLowerCase() === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800";

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div className="max-w-[80%]">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-sm font-semibold text-gray-700">{ticket.ticketId}</div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>{ticket.status}</div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${priorityClass}`}>{ticket.priority?.toLowerCase()}</div>
          </div>

          <h4 className="text-lg font-semibold text-gray-900">{ticket.title}</h4>
          <div className="text-sm text-gray-500 mt-2">
            Category: {ticket.category} {ticket.user ? `• Created by: ${ticket.user.name}` : ""} • Created: {new Date(ticket.createdAt).toLocaleDateString()}
          </div>
        </div>

      </div>
    </div>
  );
}
