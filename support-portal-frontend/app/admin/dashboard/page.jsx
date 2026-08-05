"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, TrendingUp, Users, Clock, AlertTriangle, 
  Brain, Download, LayoutDashboard, Target, Zap, Shield
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area
} from "recharts";
import api from "@/utils/axiosInstance";

const STAT_CARD_CLASSES = "bg-white p-5 rounded-xl border border-gray-100 shadow-sm";
const CHART_CARD_CLASSES = "bg-white p-5 rounded-xl border border-gray-100 shadow-sm col-span-2";

function KPICard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <div className={STAT_CARD_CLASSES}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <Icon size={16} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {trend && (
          <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${trend > 0 ? "text-green-700 bg-green-50" : trend < 0 ? "text-red-700 bg-red-50" : "text-gray-600 bg-gray-50"}`}>
            {trend > 0 ? "+" : ""}{trend}%
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [role, setRole] = useState("AGENT");
  const [activeTab, setActiveTab] = useState("agent");
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) {
        const parsed = JSON.parse(u);
        setRole(parsed.role);
        if (parsed.role === "OWNER") setActiveTab("executive");
        else if (parsed.role === "ADMIN") setActiveTab("manager");
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (activeTab) fetchData();
  }, [activeTab, days]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [res, trendRes] = await Promise.all([
        api.get(`/analytics/${activeTab}?days=${days}`),
        api.get(`/analytics/trends?days=${days}`)
      ]);
      setData(res.data);
      setTrends(trendRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await api.get(`/analytics/export?type=${activeTab}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${activeTab}_${days}d.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (e) {
      console.error("Export failed", e);
    }
    setIsExporting(false);
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="animate-spin text-blue-500"><TrendingUp size={32} /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <LayoutDashboard size={24} className="text-blue-600" />
              Intelligence Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">Analytics and KPIs across the organization</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
            {["OWNER"].includes(role) && (
              <button 
                onClick={() => setActiveTab("executive")}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === "executive" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-900"}`}
              >
                Executive
              </button>
            )}
            {["OWNER", "ADMIN"].includes(role) && (
              <button 
                onClick={() => setActiveTab("manager")}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === "manager" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-900"}`}
              >
                Manager
              </button>
            )}
            <button 
              onClick={() => setActiveTab("agent")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === "agent" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-900"}`}
            >
              Personal
            </button>
            
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            
            <select 
              value={days} 
              onChange={e => setDays(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-gray-700 px-2 py-1 outline-none cursor-pointer"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>

            {["OWNER", "ADMIN"].includes(role) && (
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors ml-1"
                title="Export to CSV"
              >
                <Download size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Content */}
        {data && (
          <div className="space-y-6">
            
            {/* Executive View */}
            {activeTab === "executive" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard title="Total Volume" value={data.total_tickets?.toLocaleString() || 0} subtitle="Tickets created" icon={BarChart3} trend={12} />
                  <KPICard title="SLA Compliance" value={`${data.sla_compliance_percent || 0}%`} subtitle="Resolution within target" icon={Target} trend={2} />
                  <KPICard title="Avg Resolution" value={`${data.avg_resolution_time_hours || 0}h`} subtitle="Time to resolve" icon={Clock} trend={-5} />
                  <KPICard title="AI Resolution Rate" value={`${data.ai_resolution_rate_percent || 0}%`} subtitle="Auto-routed & resolved" icon={Brain} trend={8} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className={CHART_CARD_CLASSES}>
                    <h3 className="text-sm font-bold text-gray-900 mb-6">Volume Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends}>
                          <defs>
                            <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} tickLine={false} axisLine={false} />
                          <YAxis tick={{fontSize: 12, fill: '#6b7280'}} tickLine={false} axisLine={false} />
                          <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                          <Area type="monotone" dataKey="volume" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className={STAT_CARD_CLASSES}>
                    <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Shield size={16} className="text-blue-500" />
                      Executive Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Open Tickets</span>
                        <span className="font-semibold text-gray-900">{data.open_tickets || 0}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Resolved</span>
                        <span className="font-semibold text-gray-900">{data.resolved_tickets || 0}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Customer Satisfaction</span>
                        <span className="font-semibold text-green-600">{data.csat_score || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-500">Knowledge Hits</span>
                        <span className="font-semibold text-gray-900">{data.knowledge_usage || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Manager View */}
            {activeTab === "manager" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard title="Queue Size" value={data.queue_size || 0} subtitle="Unassigned tickets" icon={Users} trend={-15} />
                  <KPICard title="SLA Breaches" value={data.current_sla_breaches || 0} subtitle="Currently past due" icon={AlertTriangle} trend={0} />
                  <KPICard title="Escalations" value={data.escalations || 0} subtitle="Tickets escalated" icon={TrendingUp} />
                  <KPICard title="Routing Accuracy" value={`${data.routing_accuracy || 0}%`} subtitle="AI rule matches" icon={Zap} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={STAT_CARD_CLASSES}>
                    <h3 className="text-sm font-bold text-gray-900 mb-6">Team Distribution</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.tickets_by_team || []} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="team" type="category" tick={{fontSize: 12, fill: '#4b5563'}} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                          <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className={STAT_CARD_CLASSES}>
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Operations Summary</h3>
                    <p className="text-sm text-gray-600 mb-6">Overview of agent utilization and queue health.</p>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-700">Agent Utilization</span>
                      <span className="text-lg font-bold text-blue-600">{data.agent_utilization_percent || 0}%</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Agent View */}
            {activeTab === "agent" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard title="My Open Tickets" value={data.open_tickets || 0} subtitle="Currently assigned to you" icon={LayoutDashboard} />
                  <KPICard title="Resolved Today" value={data.resolved_today || 0} subtitle="Great work!" icon={CheckCircle2} />
                  <KPICard title="My Avg Resolution" value={`${data.avg_resolution_time_hours || 0}h`} subtitle="Your average time" icon={Clock} />
                  <KPICard title="Customer Rating" value={`${data.customer_rating || 0}/5`} subtitle="Average CSAT" icon={Target} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className={STAT_CARD_CLASSES}>
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Brain size={16} className="text-blue-500" />
                      AI Collaboration
                    </h3>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-blue-800">Suggestions Accepted</span>
                        <span className="text-sm font-bold text-blue-900">{data.ai_suggestions_accepted || 0}</span>
                      </div>
                      <p className="text-[10px] text-blue-600">AI has helped you resolve tickets faster.</p>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Total Assigned (Period)</span>
                      <span className="font-semibold text-gray-900">{data.assigned_tickets || 0}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// Ensure CheckCircle2 is defined for Agent View
import { CheckCircle2 } from "lucide-react";
