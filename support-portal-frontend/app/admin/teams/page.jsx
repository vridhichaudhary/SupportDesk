"use client";
import { Network, Users, MoreVertical, Search, Plus, Star, Zap } from "lucide-react";
import { motion } from "framer-motion";

const teams = [
  {
    name: "Tier 1 Support (US)",
    description: "General inquiries, password resets, and basic troubleshooting.",
    department: "Customer Support",
    capacity: 18,
    maxCapacity: 25,
    sla: 4,
    color: "#22c55e",
    avatar: "T1",
  },
  {
    name: "Escalations Team",
    description: "Complex technical issues escalated from Tier 1.",
    department: "Customer Support",
    capacity: 6,
    maxCapacity: 10,
    sla: 12,
    color: "#f59e0b",
    avatar: "ES",
  },
  {
    name: "Enterprise Success",
    description: "Dedicated VIP support for enterprise clients.",
    department: "Customer Support",
    capacity: 4,
    maxCapacity: 5,
    sla: 2,
    color: "#8b5cf6",
    avatar: "EN",
  },
  {
    name: "Billing Inquiries",
    description: "Handles payment disputes and invoice requests.",
    department: "Billing & Accounts",
    capacity: 8,
    maxCapacity: 15,
    sla: 24,
    color: "#3b82f6",
    avatar: "BL",
  },
];

export default function TeamsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-2">Teams</h1>
          <p className="text-stone-500 font-medium text-sm">Manage agent groups, routing queues, and capacities.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-accent-600 transition-colors" />
            <input
              type="text"
              placeholder="Search teams..."
              className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-600/20 focus:border-accent-600 transition-all w-64 shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-accent-600 transition-colors shadow-sm group">
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            New Team
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teams.map((team, i) => (
          <motion.div
            key={team.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:border-stone-300 hover:shadow-md transition-all"
          >
            <div className="absolute top-4 right-4">
              <button className="p-1 text-stone-400 hover:text-stone-900 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-start gap-4 mb-6">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center border shadow-sm transition-colors duration-300"
                style={{ backgroundColor: `${team.color}15`, borderColor: `${team.color}30` }}
              >
                <span className="text-xl font-bold" style={{ color: team.color }}>
                  {team.avatar}
                </span>
              </div>
              <div className="flex-1 mt-1">
                <h3 className="text-lg font-bold text-stone-900 group-hover:text-accent-700 transition-colors line-clamp-1">
                  {team.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest bg-stone-100 px-2 py-0.5 rounded-full">
                    {team.department}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm font-medium text-stone-600 leading-relaxed mb-6 h-10 line-clamp-2">
              {team.description}
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100/80">
                <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Members</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-stone-900">{team.capacity}</span>
                  <span className="text-xs font-bold text-stone-400">/ {team.maxCapacity}</span>
                </div>
              </div>
              
              <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100/80">
                <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">SLA</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-stone-900">{team.sla}</span>
                  <span className="text-xs font-bold text-stone-400">hrs</span>
                </div>
              </div>

              <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100/80">
                <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                  <Star className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">CSAT</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-stone-900">4.8</span>
                  <span className="text-xs font-bold text-stone-400">/ 5.0</span>
                </div>
              </div>
            </div>
            
            {/* Capacity Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">
                <span>Capacity Limit</span>
                <span>{Math.round((team.capacity / team.maxCapacity) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${(team.capacity / team.maxCapacity) * 100}%`,
                    backgroundColor: (team.capacity / team.maxCapacity) > 0.9 ? '#ef4444' : team.color
                  }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
