"use client";

import { useState, useEffect } from "react";
import {
  Zap, Plus, Trash2, Pencil, CheckCircle2, XCircle,
  Loader2, ArrowLeft, Save, ToggleLeft, ToggleRight
} from "lucide-react";
import api from "@/utils/axiosInstance";
import Link from "next/link";

const TRIGGER_EVENTS = ["TICKET_CREATED", "TICKET_UPDATED", "TICKET_ASSIGNED"];
const CONDITION_KEYS = [
  { key: "category", label: "Category", values: ["BILLING", "TECHNICAL", "BUG_REPORT", "FEATURE_REQUEST", "ACCOUNT", "SECURITY", "SALES", "GENERAL"] },
  { key: "priority", label: "Priority", values: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
  { key: "sentiment", label: "Sentiment", values: ["POSITIVE", "NEUTRAL", "NEGATIVE", "URGENT"] },
  { key: "is_vip", label: "Customer is VIP", values: ["true", "false"] },
  { key: "keyword_in_subject", label: "Subject contains keyword", values: null },
  { key: "keyword_in_body", label: "Body contains keyword", values: null },
];
const ACTION_KEYS = [
  { key: "set_priority", label: "Set Priority", values: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
  { key: "set_category", label: "Set Category", values: ["BILLING", "TECHNICAL", "BUG_REPORT", "FEATURE_REQUEST", "ACCOUNT", "SECURITY", "SALES", "GENERAL"] },
];

function RuleModal({ rule, onClose, onSave, isSubmitting }) {
  const [form, setForm] = useState({
    name: rule?.name || "",
    trigger_event: rule?.trigger_event || "TICKET_CREATED",
    is_active: rule?.is_active !== false,
    conditions: Object.entries(rule?.conditions_json || {}).map(([k, v]) => ({ key: k, value: String(v) })),
    actions: Object.entries(rule?.actions_json || {}).map(([k, v]) => ({ key: k, value: String(v) })),
  });

  const addCondition = () => setForm(f => ({ ...f, conditions: [...f.conditions, { key: "category", value: "" }] }));
  const removeCondition = (i) => setForm(f => ({ ...f, conditions: f.conditions.filter((_, idx) => idx !== i) }));
  const updateCondition = (i, field, val) => setForm(f => {
    const c = [...f.conditions];
    c[i] = { ...c[i], [field]: val };
    return { ...f, conditions: c };
  });
  const addAction = () => setForm(f => ({ ...f, actions: [...f.actions, { key: "set_priority", value: "" }] }));
  const removeAction = (i) => setForm(f => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }));
  const updateAction = (i, field, val) => setForm(f => {
    const a = [...f.actions];
    a[i] = { ...a[i], [field]: val };
    return { ...f, actions: a };
  });

  const handleSubmit = () => {
    const conditions_json = Object.fromEntries(form.conditions.map(c => [c.key, c.value === "true" ? true : c.value === "false" ? false : c.value]));
    const actions_json = Object.fromEntries(form.actions.map(a => [a.key, a.value]));
    onSave({ name: form.name, trigger_event: form.trigger_event, is_active: form.is_active, conditions_json, actions_json });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{rule ? "Edit Rule" : "Create Rule"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Rule Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. High priority for billing" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Trigger Event</label>
            <select value={form.trigger_event} onChange={e => setForm(f => ({ ...f, trigger_event: e.target.value }))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TRIGGER_EVENTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Conditions (IF)</label>
              <button onClick={addCondition} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            {form.conditions.map((cond, i) => {
              const def = CONDITION_KEYS.find(c => c.key === cond.key);
              return (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <select value={cond.key} onChange={e => updateCondition(i, "key", e.target.value)}
                    className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                    {CONDITION_KEYS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  {def?.values ? (
                    <select value={cond.value} onChange={e => updateCondition(i, "value", e.target.value)}
                      className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                      {def.values.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  ) : (
                    <input value={cond.value} onChange={e => updateCondition(i, "value", e.target.value)}
                      className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="keyword..." />
                  )}
                  <button onClick={() => removeCondition(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              );
            })}
            {form.conditions.length === 0 && <p className="text-xs text-gray-400 italic">No conditions — rule always fires.</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Actions (THEN)</label>
              <button onClick={addAction} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            {form.actions.map((act, i) => {
              const def = ACTION_KEYS.find(a => a.key === act.key);
              return (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <select value={act.key} onChange={e => updateAction(i, "key", e.target.value)}
                    className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                    {ACTION_KEYS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                  </select>
                  <select value={act.value} onChange={e => updateAction(i, "value", e.target.value)}
                    className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                    {def?.values?.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <button onClick={() => removeAction(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              );
            })}
            {form.actions.length === 0 && <p className="text-xs text-red-400 italic">At least one action is required.</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
              {form.is_active ? <ToggleRight size={24} className="text-blue-500" /> : <ToggleLeft size={24} className="text-gray-400" />}
            </button>
            <span className="text-sm text-gray-600">{form.is_active ? "Active" : "Inactive"}</span>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting || !form.name || form.actions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {rule ? "Save Changes" : "Create Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AutomationRulesPage() {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/automation/rules");
      setRules(res.data);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleSave = async (data) => {
    setIsSubmitting(true);
    try {
      if (editingRule) {
        await api.patch(`/automation/rules/${editingRule.id}`, data);
      } else {
        await api.post("/automation/rules", data);
      }
      setShowModal(false);
      setEditingRule(null);
      fetchRules();
    } catch (e) { console.error(e); }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this rule?")) return;
    try {
      await api.delete(`/automation/rules/${id}`);
      fetchRules();
    } catch (e) { console.error(e); }
  };

  const openEdit = (rule) => { setEditingRule(rule); setShowModal(true); };
  const openCreate = () => { setEditingRule(null); setShowModal(true); };

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/routing" className="text-gray-400 hover:text-blue-600 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Zap size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Automation Rules</h1>
              <p className="text-xs text-gray-500">Configure routing rules that execute before AI</p>
            </div>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            <Plus size={14} />
            New Rule
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-3xl">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-700">
          <strong>How rules work:</strong> Rules evaluate ticket fields when a ticket is created. If all conditions match, the defined actions override the AI classification. Rules execute before AI fills any remaining gaps.
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-400" /></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Zap size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No rules configured.</p>
            <p className="text-xs mt-1">Add rules to automate ticket routing before AI analysis.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${rule.is_active ? "bg-green-400" : "bg-gray-300"}`} />
                      <h3 className="font-semibold text-gray-900 text-sm">{rule.name}</h3>
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{rule.trigger_event}</span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5 mt-2">
                      {Object.entries(rule.conditions_json || {}).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1">
                          <span className="text-gray-400">IF</span>
                          <span className="font-mono text-gray-700">{k}</span>
                          <span className="text-gray-400">=</span>
                          <span className="font-mono text-blue-600">{String(v)}</span>
                        </div>
                      ))}
                      {Object.entries(rule.actions_json || {}).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1">
                          <span className="text-gray-400">THEN</span>
                          <span className="font-mono text-gray-700">{k}</span>
                          <span className="text-gray-400">=</span>
                          <span className="font-mono text-green-600">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => openEdit(rule)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <RuleModal rule={editingRule} onClose={() => { setShowModal(false); setEditingRule(null); }} onSave={handleSave} isSubmitting={isSubmitting} />
      )}
    </div>
  );
}
