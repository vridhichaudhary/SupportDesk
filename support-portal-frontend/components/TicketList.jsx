"use client";
import TicketItem from "./TicketItem";

export default function TicketList({ loading, data = { items: [], total: 0 }, onPage }) {
  const { items, total, page = 1, limit = 10 } = data;

  const totalPages = Math.ceil(total / (limit || 10));

  return (
    <div>
      {loading && <div className="p-6">Loading...</div>}

      {!loading && items.length === 0 && <div className="p-6 border rounded text-gray-500">No tickets yet. Create a new ticket.</div>}

      <div className="space-y-4">
        {!loading && items.map(t => <TicketItem key={t._id} ticket={t} />)}
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex items-center gap-3 justify-center mt-4">
          <button onClick={()=>onPage(Math.max(1, (page || 1)-1))} className="px-3 py-1 border rounded">Prev</button>
          <div>Page {page || 1} / {totalPages}</div>
          <button onClick={()=>onPage(Math.min(totalPages, (page || 1)+1))} className="px-3 py-1 border rounded">Next</button>
        </div>
      )}
    </div>
  );
}
