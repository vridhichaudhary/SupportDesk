export default function StatCard({ title, value, smallLabel }) {
    return (
      <div className="bg-[#0b0b0b] border border-[#222] rounded-lg p-5 flex-1 min-w-[12rem]">
        <div className="text-sm text-gray-400 mb-2">{title}</div>
        <div className="text-3xl font-bold text-white">{value}</div>
        {smallLabel ? <div className="text-xs text-gray-500 mt-2">{smallLabel}</div> : null}
      </div>
    );
  }
  