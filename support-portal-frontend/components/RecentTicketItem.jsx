// components/RecentTicketItem.jsx
export default function RecentTicketItem({ ticket }) {
    const priorityLower = (ticket.priority || "").toLowerCase();
    const status = ticket.status || "open";
  
    const priorityClasses =
      priorityLower === "high"
        ? "bg-red-50 text-red-700"
        : priorityLower === "medium"
        ? "bg-yellow-50 text-yellow-800"
        : "bg-green-50 text-green-700";
  
    const statusClasses =
      status === "in-progress"
        ? "bg-yellow-50 text-yellow-800"
        : status === "open"
        ? "bg-blue-50 text-blue-700"
        : "bg-green-50 text-green-700";
  
    return (
      <div className="border rounded p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="max-w-[78%]">
            <div className="text-xs font-semibold text-gray-600">{ticket.ticketId}</div>
            <div className="font-medium text-gray-900">{ticket.title}</div>
            <div className="text-sm text-gray-500 mt-1">
              Category: {ticket.category} • Created: {new Date(ticket.createdAt).toLocaleDateString()}
            </div>
          </div>
  
          <div className="flex flex-col items-end gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${priorityClasses}`}>{ticket.priority}</div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses}`}>{ticket.status}</div>
          </div>
        </div>
      </div>
    );
  }
  