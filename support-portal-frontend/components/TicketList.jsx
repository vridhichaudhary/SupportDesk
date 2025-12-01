"use client";
import { useState } from "react";
import TicketItem from "./TicketItem";

export default function TicketList({ data, loading, onFilterChange, onPage, query }) {
  const { items = [], total = 0, page = 1, limit = 10 } = data || {};
  const totalPages = Math.ceil(total / (limit || 1));

  return (
    <div>
      {loading && <div className="p-4 text-gray-400">Loading...</div>}

      {!loading && items.length === 0 && <div className="p-6 border rounded text-gray-500">No tickets yet. Create a new ticket.</div>}

      {!loading && items.map(t => <TicketItem key={t._id} ticket={t} />)}

      {!loading && totalPages > 1 && (
        <div className="flex gap-2 items-center mt-4">
          <button onClick={()=>onPage(Math.max(1, (query.page||1)-1))} className="px-3 py-1 border rounded">Prev</button>
          <div>Page {query.page || 1} / {totalPages}</div>
          <button onClick={()=>onPage(Math.min(totalPages, (query.page||1)+1))} className="px-3 py-1 border rounded">Next</button>
        </div>
      )}
    </div>
  );
}
