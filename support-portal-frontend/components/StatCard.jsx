import { motion } from "framer-motion";

export default function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="p-2.5 bg-accent-50 rounded-xl border border-accent-100">
          {Icon && <Icon className="w-5 h-5 text-accent-600" />}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">{title}</div>
        <div className="text-3xl font-bold text-stone-900 tracking-tight leading-none">{value}</div>
      </div>
    </div>
  );
}

