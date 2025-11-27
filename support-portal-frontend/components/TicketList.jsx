"use client";
import TicketItem from "./TicketItem";

export default function TicketList({ loading, data = { items: [], total: 0 }, onFilterChange, onPage, query }) {
  const { items, total, page = 1, limit = 10 } = data;

  function handleSortChange(e) {
    onFilterChange({ sort: e.target.value });
  }
  function handleFilter(e) {
    const { name, value } = e.target;
    onFilterChange({ [name]: value });
  }

  const totalPages = Math.ceil(total / (limit || 10));

  return (
    <div>
      <div className="flex gap-3 items-center mb-4">
        <select name="status" value={query.status || ""} onChange={handleFilter} className="p-2 border rounded">
          <option value="">All status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <select name="priority" value={query.priority || ""} onChange={handleFilter} className="p-2 border rounded">
          <option value="">All priority</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>

        <select name="category" value={query.category || ""} onChange={handleFilter} className="p-2 border rounded">
          <option value="">All category</option>
          <option value="Technical">Technical</option>
          <option value="Billing">Billing</option>
          <option value="General">General</option>
        </select>

        <select value={query.sort || "-createdAt"} onChange={handleSortChange} className="ml-auto p-2 border rounded">
          <option value="-createdAt">Newest first</option>
          <option value="createdAt">Oldest first</option>
          <option value="-priority">Priority high→low</option>
          <option value="priority">Priority low→high</option>
        </select>
      </div>

      {loading && <div>Loading...</div>}

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
