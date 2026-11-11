"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Building2,
  Users,
  FolderTree,
  MoreVertical,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/utils/axiosInstance";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [toast, setToast] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#22c55e",
  });
  const [formErrors, setFormErrors] = useState({});

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/departments");
      const data = res.data;
      // Backend returns DepartmentListResponse { items, total, skip, limit }
      setDepartments(data.items || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error("Failed to load departments:", err);
      setError(err.response?.data?.message || err.response?.data?.detail || "Failed to load departments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Department name is required.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
      };
      const res = await api.post("/departments", payload);
      const newDept = res.data;
      setDepartments((prev) => [newDept, ...prev]);
      setShowModal(false);
      setFormData({ name: "", description: "", color: "#22c55e" });
      showToast("Department created successfully.");
    } catch (err) {
      console.error("Create department error:", err);
      const errMsg = err.response?.data?.detail || err.response?.data?.message || "Failed to create department.";
      setFormErrors({ submit: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (id, name) => {
    if (!confirm(`Are you sure you want to delete department "${name}"?`)) return;

    try {
      await api.delete(`/departments/${id}`);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      setActiveMenu(null);
      showToast(`Department "${name}" deleted.`);
    } catch (err) {
      console.error("Delete department error:", err);
      alert(err.response?.data?.detail || "Failed to delete department.");
    }
  };

  const filteredDepartments = useMemo(() => {
    if (!search.trim()) return departments;
    const term = search.toLowerCase();
    return departments.filter(
      (d) =>
        (d.name && d.name.toLowerCase().includes(term)) ||
        (d.description && d.description.toLowerCase().includes(term))
    );
  }, [departments, search]);

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
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-2">Departments</h1>
          <p className="text-stone-500 font-medium text-sm">
            Organize your organization into functional operational units.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-accent-600 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments..."
              className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-600/20 focus:border-accent-600 transition-all w-64 shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors shadow-sm group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            New Department
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
          <p className="text-sm font-medium text-stone-500">Loading departments from database...</p>
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
            onClick={fetchDepartments}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredDepartments.length === 0 && (
        <div className="text-center py-20 bg-stone-50/50 border border-dashed border-stone-200 rounded-3xl p-8 space-y-4">
          <div className="w-16 h-16 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Building2 className="w-8 h-8 text-stone-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-stone-800">
              {search ? "No matching departments found" : "No departments yet"}
            </h3>
            <p className="text-sm text-stone-500 max-w-sm mx-auto">
              {search
                ? `No departments matched "${search}". Try adjusting your query.`
                : "Get started by creating your first organizational department."}
            </p>
          </div>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          )}
        </div>
      )}

      {/* Departments Grid */}
      {!loading && !error && filteredDepartments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept, i) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm hover:border-stone-300 hover:shadow-md transition-all flex flex-col relative"
            >
              <div className="p-6 flex-1 relative flex flex-col">
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setActiveMenu(activeMenu === dept.id ? null : dept.id)}
                    className="p-1 text-stone-400 hover:text-stone-900 transition-colors rounded-lg hover:bg-stone-50"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenu === dept.id && (
                    <div className="absolute right-0 mt-1 w-36 bg-white border border-stone-200 rounded-xl shadow-lg z-20 py-1">
                      <button
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-stone-50 border border-stone-100 shadow-sm shrink-0">
                    <Building2 className="w-6 h-6" style={{ color: dept.color || "#22c55e" }} />
                  </div>
                  <div className="pr-6">
                    <h3 className="text-lg font-bold text-stone-900 group-hover:text-stone-800 transition-colors line-clamp-1">
                      {dept.name}
                    </h3>
                    <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mt-0.5">
                      Status: {dept.status || "ACTIVE"}
                    </div>
                  </div>
                </div>

                <p className="text-sm font-medium text-stone-600 leading-relaxed mb-6 flex-1 line-clamp-3">
                  {dept.description || "No description provided for this department."}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-auto pt-2">
                  <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100/80">
                    <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                      <FolderTree className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Department</span>
                    </div>
                    <div className="text-xs font-bold text-stone-700 truncate">{dept.name}</div>
                  </div>
                  <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-100/80">
                    <div className="flex items-center gap-1.5 text-stone-400 mb-1">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Active</span>
                    </div>
                    <div className="text-xs font-bold text-emerald-600">Verified</div>
                  </div>
                </div>
              </div>

              <div className="h-1.5 w-full" style={{ backgroundColor: dept.color || "#22c55e" }} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Department Modal */}
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
                  <h3 className="text-xl font-bold text-stone-900">Create New Department</h3>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Add a functional operational department to your tenant.
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

              <form onSubmit={handleCreateDepartment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Customer Support"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                  />
                  {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief summary of department responsibilities..."
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Theme Color
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
                    Create Department
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
