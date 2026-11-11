"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Network,
  Users,
  MoreVertical,
  Search,
  Plus,
  Trash2,
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  RefreshCw,
  FolderTree,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/utils/axiosInstance";

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [toast, setToast] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    department_id: "",
    color: "#3b82f6",
    max_capacity: 25,
    default_sla: 4,
  });
  const [formErrors, setFormErrors] = useState({});

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsRes, deptsRes] = await Promise.all([
        api.get("/teams"),
        api.get("/departments"),
      ]);
      const teamsData = teamsRes.data;
      const deptsData = deptsRes.data;
      setTeams(teamsData.items || (Array.isArray(teamsData) ? teamsData : []));
      setDepartments(deptsData.items || (Array.isArray(deptsData) ? deptsData : []));
    } catch (err) {
      console.error("Failed to fetch teams data:", err);
      setError(err.response?.data?.detail || "Failed to load teams. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deptMap = useMemo(() => {
    const map = {};
    departments.forEach((d) => {
      map[d.id] = d.name;
    });
    return map;
  }, [departments]);

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Team name is required.";
    if (formData.max_capacity < 1 || formData.max_capacity > 500) {
      errors.max_capacity = "Capacity must be between 1 and 500.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        department_id: formData.department_id || null,
        color: formData.color,
        max_capacity: parseInt(formData.max_capacity, 10),
        default_sla: formData.default_sla ? parseInt(formData.default_sla, 10) : null,
      };
      const res = await api.post("/teams", payload);
      const newTeam = res.data;
      setTeams((prev) => [newTeam, ...prev]);
      setShowModal(false);
      setFormData({
        name: "",
        description: "",
        department_id: "",
        color: "#3b82f6",
        max_capacity: 25,
        default_sla: 4,
      });
      showToast("Team created successfully.");
    } catch (err) {
      console.error("Create team error:", err);
      const errMsg = err.response?.data?.detail || err.response?.data?.message || "Failed to create team.";
      setFormErrors({ submit: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (id, name) => {
    if (!confirm(`Are you sure you want to delete team "${name}"?`)) return;

    try {
      await api.delete(`/teams/${id}`);
      setTeams((prev) => prev.filter((t) => t.id !== id));
      setActiveMenu(null);
      showToast(`Team "${name}" deleted.`);
    } catch (err) {
      console.error("Delete team error:", err);
      alert(err.response?.data?.detail || "Failed to delete team.");
    }
  };

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchesSearch =
        !search.trim() ||
        (t.name && t.name.toLowerCase().includes(search.toLowerCase())) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

      const matchesDept =
        selectedDeptFilter === "ALL" || t.department_id === selectedDeptFilter;

      return matchesSearch && matchesDept;
    });
  }, [teams, search, selectedDeptFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-2">Teams</h1>
          <p className="text-stone-500 font-medium text-sm">
            Manage agent groups, routing queues, and capacities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900/10 shadow-sm"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams..."
              className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all w-60 shadow-sm"
            />
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors shadow-sm group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            New Team
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
          <p className="text-sm font-medium text-stone-500">Loading teams from database...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-800 font-medium text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredTeams.length === 0 && (
        <div className="text-center py-20 bg-stone-50/50 border border-dashed border-stone-200 rounded-3xl p-8 space-y-4">
          <div className="w-16 h-16 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Network className="w-8 h-8 text-stone-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-stone-800">
              {search || selectedDeptFilter !== "ALL" ? "No matching teams found" : "No teams configured"}
            </h3>
            <p className="text-sm text-stone-500 max-w-sm mx-auto">
              {search || selectedDeptFilter !== "ALL"
                ? "Try clearing your filters or search query."
                : "Organize your support agents into routing teams and queues."}
            </p>
          </div>
          {!search && selectedDeptFilter === "ALL" && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Team
            </button>
          )}
        </div>
      )}

      {/* Teams Grid */}
      {!loading && !error && filteredTeams.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTeams.map((team, i) => {
            const avatarStr = team.name ? team.name.slice(0, 2).toUpperCase() : "TM";
            const deptName = team.department_id ? deptMap[team.department_id] || "Department" : "Unassigned";

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group relative bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:border-stone-300 hover:shadow-md transition-all flex flex-col"
              >
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setActiveMenu(activeMenu === team.id ? null : team.id)}
                    className="p-1 text-stone-400 hover:text-stone-900 transition-colors rounded-lg hover:bg-stone-50"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenu === team.id && (
                    <div className="absolute right-0 mt-1 w-36 bg-white border border-stone-200 rounded-xl shadow-lg z-20 py-1">
                      <button
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm shrink-0"
                    style={{
                      backgroundColor: `${team.color || "#3b82f6"}15`,
                      borderColor: `${team.color || "#3b82f6"}30`,
                    }}
                  >
                    <span className="text-xl font-bold" style={{ color: team.color || "#3b82f6" }}>
                      {avatarStr}
                    </span>
                  </div>
                  <div className="flex-1 pr-6">
                    <h3 className="text-lg font-bold text-stone-900 group-hover:text-stone-800 transition-colors line-clamp-1">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest bg-stone-100 px-2.5 py-0.5 rounded-full">
                        {deptName}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm font-medium text-stone-600 leading-relaxed mb-6 flex-1 line-clamp-2">
                  {team.description || "No description provided for this team."}
                </p>

                <div className="grid grid-cols-3 gap-3 mt-auto">
                  <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100/80">
                    <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Load</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-stone-900">{team.current_capacity || 0}</span>
                      <span className="text-xs font-bold text-stone-400">/ {team.max_capacity}</span>
                    </div>
                  </div>

                  <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100/80">
                    <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">SLA</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-stone-900">{team.default_sla || 4}</span>
                      <span className="text-xs font-bold text-stone-400">hrs</span>
                    </div>
                  </div>

                  <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100/80">
                    <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                      <FolderTree className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Status</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 mt-1">
                      {team.status || "ACTIVE"}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">Create New Team</h3>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Configure a support team and set routing parameters.
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formErrors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formErrors.submit}
                </div>
              )}

              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Tier 1 Support (US)"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                  />
                  {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                  >
                    <option value="">No Department (Standalone)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of team responsibilities..."
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Max Capacity
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={formData.max_capacity}
                      onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                    />
                    {formErrors.max_capacity && (
                      <p className="text-xs text-red-600 mt-1">{formErrors.max_capacity}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Default SLA (Hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={formData.default_sla}
                      onChange={(e) => setFormData({ ...formData, default_sla: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Color Theme
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-stone-200 cursor-pointer p-0.5 bg-white"
                    />
                    <span className="text-xs font-mono font-medium text-stone-600">{formData.color}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-stone-600 hover:text-stone-900 font-bold text-sm rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-stone-900 text-white font-bold text-sm rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Create Team
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
