"use client";
import { Building2, Users, FolderTree, MoreVertical, Search, Plus } from "lucide-react";
import { motion } from "framer-motion";

const departments = [
  {
    name: "Customer Support",
    description: "Frontline assistance for customer queries and technical issues.",
    teams: 4,
    members: 24,
    color: "#22c55e",
    manager: "Rahul Sharma",
  },
  {
    name: "Billing & Accounts",
    description: "Handles payment disputes, invoices, and account upgrades.",
    teams: 2,
    members: 8,
    color: "#3b82f6",
    manager: "Alice Brown",
  },
  {
    name: "IT Infrastructure",
    description: "Internal and external systems reliability and platform health.",
    teams: 3,
    members: 12,
    color: "#f59e0b",
    manager: "Atlas Johnson",
  },
  {
    name: "Product Operations",
    description: "Bridges the gap between support, engineering, and product.",
    teams: 1,
    members: 5,
    color: "#8b5cf6",
    manager: "Sarah Wilson",
  },
];

export default function DepartmentsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-2">Departments</h1>
          <p className="text-stone-500 font-medium text-sm">Organize your organization into functional units.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-accent-600 transition-colors" />
            <input
              type="text"
              placeholder="Search departments..."
              className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-600/20 focus:border-accent-600 transition-all w-64 shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-accent-600 transition-colors shadow-sm group">
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            New Department
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {departments.map((dept, i) => (
          <motion.div
            key={dept.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:border-stone-300 hover:shadow-md transition-all flex flex-col"
          >
            <div className="p-6 flex-1 relative">
              <div className="absolute top-4 right-4">
                <button className="p-1 text-stone-400 hover:text-stone-900 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center bg-stone-50 border border-stone-100 shadow-sm"
                >
                  <Building2 className="w-6 h-6" style={{ color: dept.color }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 group-hover:text-accent-700 transition-colors">
                    {dept.name}
                  </h3>
                  <div className="text-xs font-semibold text-stone-500 uppercase tracking-widest mt-0.5">
                    Manager: {dept.manager}
                  </div>
                </div>
              </div>

              <p className="text-sm font-medium text-stone-600 leading-relaxed mb-6">
                {dept.description}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100/80">
                  <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                    <FolderTree className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Teams</span>
                  </div>
                  <div className="text-xl font-bold text-stone-900">{dept.teams}</div>
                </div>
                <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100/80">
                  <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Members</span>
                  </div>
                  <div className="text-xl font-bold text-stone-900">{dept.members}</div>
                </div>
              </div>
            </div>
            
            <div 
              className="h-1.5 w-full"
              style={{ backgroundColor: dept.color }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
