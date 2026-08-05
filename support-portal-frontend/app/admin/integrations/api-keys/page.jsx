"use client";

import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Eye, EyeOff, Copy, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import api from "@/utils/axiosInstance";

const SCOPE_OPTIONS = [
  { value: "tickets:read", label: "Tickets — Read" },
  { value: "tickets:write", label: "Tickets — Write" },
  { value: "customers:read", label: "Customers — Read" },
  { value: "customers:write", label: "Customers — Write" },
  { value: "knowledge:read", label: "Knowledge — Read" },
  { value: "knowledge:write", label: "Knowledge — Write" },
  { value: "documents:read", label: "Documents — Read" },
  { value: "analytics:read", label: "Analytics — Read" },
  { value: "organizations:admin", label: "Organizations — Admin" },
];

function CreateKeyModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState(["tickets:read", "tickets:write"]);
  const [isLoading, setIsLoading] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const toggleScope = (scope) => {
    setScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post("/api-keys", { name, scopes });
      setNewKey(res.data.plain_key);
      onCreated();
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (newKey) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex items-center justify-center w-14 h-14 bg-green-50 rounded-full mb-6 mx-auto">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">API Key Created</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Copy this key now — <strong>it will never be shown again.</strong>
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3 mb-6">
            <code className="text-xs text-gray-800 flex-1 break-all font-mono">{newKey}</code>
            <button onClick={handleCopy} className="flex-shrink-0 text-blue-600 hover:text-blue-700">
              {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">Store this key securely. Treat it like a password. Do not commit it to source control.</p>
          </div>
          <button onClick={onClose} className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition">
            Done — I've copied my key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Create New API Key</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Key Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g. Production Integration"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
            <div className="grid grid-cols-2 gap-2">
              {SCOPE_OPTIONS.map(s => (
                <label key={s.value} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 transition">
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.value)}
                    onChange={() => toggleScope(s.value)}
                    className="accent-blue-600"
                  />
                  <span className="text-xs text-gray-700">{s.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Create Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function APIKeysPage() {
  const [keys, setKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await api.get("/api-keys");
      setKeys(res.data);
    } catch (err) { console.error(err); }
    setIsLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleRevoke = async (id) => {
    if (!confirm("Revoke this API key? All integrations using it will stop working immediately.")) return;
    try {
      await api.delete(`/api-keys/${id}`);
      fetchKeys();
    } catch (err) { console.error(err); }
  };

  return (
    <>
      {showModal && <CreateKeyModal onClose={() => setShowModal(false)} onCreated={fetchKeys} />}
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">API Keys</h1>
            <p className="text-gray-500 text-sm">Manage API keys for programmatic access to the SupportDesk REST API.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Create API Key
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 mb-0.5">Security Notice</p>
            <p className="text-sm text-blue-700">API keys are shown only once at creation. Use the <code className="bg-blue-100 px-1 rounded">X-API-Key</code> header or pass as a Bearer token to authenticate requests.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : keys.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Key className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5 text-left font-medium text-gray-600">Name</th>
                  <th className="px-5 py-3.5 text-left font-medium text-gray-600">Prefix</th>
                  <th className="px-5 py-3.5 text-left font-medium text-gray-600">Scopes</th>
                  <th className="px-5 py-3.5 text-left font-medium text-gray-600">Last Used</th>
                  <th className="px-5 py-3.5 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {keys.map(key => (
                  <tr key={key.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-medium text-gray-900">{key.name}</td>
                    <td className="px-5 py-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">{key.prefix}••••••••</code>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(key.scopes || []).slice(0, 3).map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{s}</span>
                        ))}
                        {key.scopes?.length > 3 && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">+{key.scopes.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => handleRevoke(key.id)} className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
