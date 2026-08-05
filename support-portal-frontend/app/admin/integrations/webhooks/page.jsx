"use client";

import { useState, useEffect } from "react";
import { Webhook, Plus, Trash2, CheckCircle2, XCircle, Clock, Loader2, X, ChevronRight } from "lucide-react";
import api from "@/utils/axiosInstance";

const ALL_EVENTS = [
  "ticket.created", "ticket.updated", "ticket.closed", "ticket.assigned",
  "knowledge.article.published", "document.processed",
  "routing.completed", "ai.answer.generated",
  "automation.executed", "analytics.snapshot.created"
];

const STATUS_STYLES = {
  SUCCESS: "bg-green-50 text-green-700 border-green-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

function CreateWebhookModal({ onClose, onCreated }) {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [secret, setSecret] = useState(null);

  const toggleEvent = (e) =>
    setEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

  const handleCreate = async (ev) => {
    ev.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post("/webhooks", { url, description, subscribed_events: events });
      setSecret(res.data.hmac_secret);
      onCreated();
    } catch (err) { console.error(err); }
    setIsLoading(false);
  };

  if (secret) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex items-center justify-center w-14 h-14 bg-green-50 rounded-full mb-6 mx-auto">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">Webhook Registered!</h2>
          <p className="text-sm text-gray-500 text-center mb-4">Use this secret to verify incoming requests. It will not be shown again.</p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 font-medium mb-1">HMAC Signing Secret</p>
            <code className="text-xs text-gray-800 break-all font-mono">{secret}</code>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Every delivery includes an <code className="bg-gray-100 px-1 rounded text-xs">X-SupportDesk-Signature</code> header.
            Verify it using HMAC SHA256 with this secret.
          </p>
          <button onClick={onClose} className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Register Webhook Endpoint</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Endpoint URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              placeholder="https://your-server.com/hooks/supportdesk"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Slack notification handler"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Events to Subscribe
              <span className="ml-2 text-xs text-gray-400 font-normal">(leave blank to receive all events)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EVENTS.map(e => (
                <label key={e} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 transition">
                  <input
                    type="checkbox"
                    checked={events.includes(e)}
                    onChange={() => toggleEvent(e)}
                    className="accent-blue-600"
                  />
                  <span className="text-xs text-gray-700 font-mono">{e}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2 transition">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
              Register Endpoint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeliveryLogsModal({ endpoint, onClose }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get(`/webhooks/${endpoint.id}/deliveries`).then(r => {
      setLogs(r.data);
      setIsLoading(false);
    }).catch(console.error);
  }, [endpoint.id]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Delivery Logs</h2>
            <p className="text-sm text-gray-500 truncate max-w-sm mt-1">{endpoint.url}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-2" />
            <p>No deliveries yet. Deliveries will appear here when events are triggered.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map(log => (
              <div key={log.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 font-mono">{log.event_type}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {log.status_code && (
                    <span className="text-xs font-mono text-gray-600">{log.status_code}</span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[log.delivery_status] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {log.delivery_status}
                  </span>
                  {log.retry_count > 0 && (
                    <span className="text-xs text-gray-400">Retry #{log.retry_count}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);

  const fetchEndpoints = async () => {
    try {
      const res = await api.get("/webhooks");
      setEndpoints(res.data);
    } catch (err) { console.error(err); }
    setIsLoading(false);
  };

  useEffect(() => { fetchEndpoints(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this webhook endpoint? All delivery logs will be lost.")) return;
    try {
      await api.delete(`/webhooks/${id}`);
      fetchEndpoints();
    } catch (err) { console.error(err); }
  };

  return (
    <>
      {showModal && <CreateWebhookModal onClose={() => setShowModal(false)} onCreated={fetchEndpoints} />}
      {selectedEndpoint && <DeliveryLogsModal endpoint={selectedEndpoint} onClose={() => setSelectedEndpoint(null)} />}

      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Webhooks</h1>
            <p className="text-gray-500 text-sm">Register endpoints to receive real-time event notifications via HTTP POST.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Register Endpoint
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 mb-6 font-mono">
          <span className="text-gray-400">// Verify incoming requests with HMAC SHA256</span><br />
          <span className="text-blue-700">const</span> expected = hmac(<span className="text-green-700">your_secret</span>, <span className="text-green-700">body</span>, <span className="text-green-700">&apos;sha256&apos;</span>);<br />
          <span className="text-blue-700">const</span> valid = timingSafeEqual(expected, req.headers[<span className="text-green-700">&apos;x-supportdesk-signature&apos;</span>]);
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : endpoints.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Webhook className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No webhook endpoints registered. Add one to start receiving events.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map(ep => (
              <div key={ep.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Webhook className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm text-gray-900 font-medium truncate">{ep.url}</code>
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${ep.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                      {ep.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {ep.description && <p className="text-sm text-gray-500 mb-2">{ep.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {ep.subscribed_events.length === 0
                      ? <span className="text-xs text-gray-400">Subscribed to all events</span>
                      : ep.subscribed_events.map(e => (
                          <span key={e} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-mono">{e}</span>
                        ))
                    }
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSelectedEndpoint(ep)}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 hover:bg-blue-50 rounded-lg transition"
                  >
                    Logs <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(ep.id)} className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
