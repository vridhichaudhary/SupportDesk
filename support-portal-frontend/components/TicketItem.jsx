export default function TicketItem({ ticket }) {
  const badgeStatus =
    ticket.status === "open" ? "bg-blue-100 text-blue-800" :
    ticket.status === "in-progress" ? "bg-yellow-100 text-yellow-800" :
    ticket.status === "resolved" ? "bg-green-100 text-green-800" :
    "bg-gray-100 text-gray-800";

  const badgePriority =
    ticket.priority === "High" ? "bg-red-700 text-white" :
    ticket.priority === "Medium" ? "bg-yellow-500 text-white" :
    "bg-green-600 text-white";

  return (
    <div className="mb-6 p-6 border rounded-lg bg-[#0b0b0b] text-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-300 mb-2">{ticket.ticketId}</div>
          <div className="text-xl font-semibold">{ticket.title}</div>
          <div className="mt-3 text-sm text-gray-400">
            Category: {ticket.category} &nbsp; • &nbsp;
            {ticket.user?.name ? `User: ${ticket.user.name}` : ""}
            &nbsp; • &nbsp;
            Created: {new Date(ticket.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2 items-center">
            <span className={`px-3 py-1 rounded-full text-xs ${badgeStatus}`}>{ticket.status}</span>
            <span className={`px-3 py-1 rounded-full text-xs ${badgePriority}`}>{ticket.priority.toLowerCase()}</span>
          </div>
          {/* removed VIEW button per request */}
        </div>
      </div>
    </div>
  );
}
