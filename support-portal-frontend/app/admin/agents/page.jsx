"use client";
import { Users, Ticket, Star, Shield, BadgeCheck, MoreVertical, Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

const agents = [
  {
    name: "John Doe",
    role: "Senior Support Agent",
    tickets: 0,
    status: "online",
    experience: "5 years",
    rating: "4.9",
    avatar: "JD"
  },
  {
    name: "Jane Smith",
    role: "Support Agent",
    tickets: 3,
    status: "busy",
    experience: "2 years",
    rating: "4.7",
    avatar: "JS"
  },
  {
    name: "Mike Johnson",
    role: "Technical Specialist",
    tickets: 1,
    status: "online",
    experience: "4 years",
    rating: "4.8",
    avatar: "MJ"
  },
  {
    name: "Sarah Wilson",
    role: "Support Agent",
    tickets: 1,
    status: "away",
    experience: "3 years",
    rating: "4.6",
    avatar: "SW"
  }
];

export default function AgentsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-2">Support Agent Directory</h1>
          <p className="text-stone-500 font-medium max-w-2xl">
            Monitor team performance, ticket distribution, and personnel availability in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-accent-600 transition-colors" />
            <input
              type="text"
              placeholder="Filter agents..."
              className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-600/20 focus:border-accent-600 transition-all w-64"
            />
          </div>
          <button className="p-2.5 bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {agents.map((agent, i) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:border-accent-300 hover:shadow-md hover:shadow-stone-200/50 transition-all"
          >
            <div className="absolute top-4 right-4">
              <button className="p-1 text-stone-400 hover:text-stone-900 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center">
              {/* Avatar & Status Indicator */}
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center group-hover:bg-accent-50 group-hover:border-accent-100 transition-colors duration-300">
                  <span className="text-2xl font-bold text-stone-300 group-hover:text-accent-600 transition-colors">
                    {agent.avatar}
                  </span>
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white shadow-sm ${agent.status === "online" ? "bg-emerald-500" : agent.status === "busy" ? "bg-amber-500" : "bg-stone-300"
                  }`} title={agent.status} />
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="text-lg font-bold text-stone-900 group-hover:text-accent-700 transition-colors">
                  {agent.name}
                </h3>
                <div className="flex items-center justify-center gap-1.5 text-stone-500 font-semibold text-[11px] uppercase tracking-wider">
                  {agent.role.includes("Senior") || agent.role.includes("Specialist") ? (
                    <Shield className="w-3 h-3 text-accent-600" />
                  ) : (
                    <BadgeCheck className="w-3 h-3 text-stone-400" />
                  )}
                  {agent.role}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 w-full gap-3">
                <div className="bg-stone-50/50 rounded-xl p-3 border border-stone-100">
                  <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                    <Ticket className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Active</span>
                  </div>
                  <div className="text-lg font-bold text-stone-900">{agent.tickets}</div>
                </div>
                <div className="bg-stone-50/50 rounded-xl p-3 border border-stone-100">
                  <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                    <Star className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Rating</span>
                  </div>
                  <div className="text-lg font-bold text-stone-900">{agent.rating}</div>
                </div>
              </div>

            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
