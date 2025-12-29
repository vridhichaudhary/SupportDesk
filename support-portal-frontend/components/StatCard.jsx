import { motion } from "framer-motion";

export default function StatCard({ title, value, icon: Icon, colorClass = "bg-accent-500" }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="p-6 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10`}>
          {Icon && <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />}
        </div>
      </div>
      <div>
        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</div>
        <div className="text-3xl font-black text-slate-900 leading-none">{value}</div>
      </div>
    </motion.div>
  );
}

