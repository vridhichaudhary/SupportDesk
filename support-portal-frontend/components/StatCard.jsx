export default function StatCard({ title, value, note, accent = "bg-blue-100" }) {
  return (
    <div className="p-6 bg-white rounded-lg border min-w-[12rem]">
      <div className="text-sm text-gray-500 mb-2">{title}</div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {note && <div className="text-sm text-gray-500 mt-2">{note}</div>}
    </div>
  );
}
