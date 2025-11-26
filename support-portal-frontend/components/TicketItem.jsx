import { format } from "date-fns";

function Tag({ text, colorClass }) {
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>{text}</span>;
}

export default function TicketItem({ ticket }) {
  const date = ticket.createdAt ? format(new Date(ticket.createdAt), "yyyy-MM-dd") : "";
  // map priorities/status to colors
  const priorityColor = ticket.priority === "high" ? "bg-red-600 text-white" : ticket.priority === "medium" ? "bg-yellow-400 text-black" : "bg-green-600 text-white";
  const statusColor = ticket.status === "open" ? "bg-blue-600 text-white" : ticket.status === "in-progress" ? "bg-yellow-500 text-black" : "bg-green-600 text-white";

  return (
    <div className="bg-[#0b0b0b] border border-[#222] rounded-lg p-5 mb-4 flex items-center justify-between">
      <div>
        <div className="text-white font-semibold">TK-{String(ticket._id).slice(-4).toUpperCase()}</div>
        <div className="text-gray-300 mt-1">{ticket.title}</div>
      </div>

      <div className="flex items-center gap-3">
        <Tag text={ticket.priority || "low"} colorClass={priorityColor} />
        <Tag text={ticket.status || "open"} colorClass={statusColor} />
        <div className="text-gray-500 text-sm">{date}</div>
      </div>
    </div>
  );
}
