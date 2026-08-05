"use client";

import { useState, useEffect } from "react";
import { Link2, Code, Webhook, Key, Search, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import api from "@/utils/axiosInstance";

const INTEGRATIONS = [
  {
    id: "slack",
    name: "Slack",
    description: "Send notifications to Slack channels when tickets are created or updated.",
    icon: <div className="w-10 h-10 bg-[#4A154B] rounded-lg flex items-center justify-center text-white font-bold">#</div>,
    status: "available",
  },
  {
    id: "msteams",
    name: "Microsoft Teams",
    description: "Connect SupportDesk with your Microsoft Teams workspace for instant alerts.",
    icon: <div className="w-10 h-10 bg-[#6264A7] rounded-lg flex items-center justify-center text-white font-bold">T</div>,
    status: "available",
  },
  {
    id: "jira",
    name: "Jira Software",
    description: "Create and link Jira issues directly from support tickets.",
    icon: <div className="w-10 h-10 bg-[#0052CC] rounded-lg flex items-center justify-center text-white font-bold">J</div>,
    status: "coming_soon",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Link GitHub pull requests and issues to technical support tickets.",
    icon: <div className="w-10 h-10 bg-[#24292E] rounded-lg flex items-center justify-center text-white font-bold">G</div>,
    status: "coming_soon",
  },
  {
    id: "email",
    name: "Email SMTP",
    description: "Configure custom SMTP servers for outbound ticket replies and notifications.",
    icon: <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">@</div>,
    status: "available",
  }
];

export default function IntegrationsMarketplace() {
  const [activeIntegrations, setActiveIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const res = await api.get("/integrations");
      setActiveIntegrations(res.data.map(i => i.provider));
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleToggle = async (provider, isActive) => {
    try {
      if (isActive) {
        // Find ID and delete (mock behavior for now, ideally we'd fetch IDs properly)
        const res = await api.get("/integrations");
        const integration = res.data.find(i => i.provider === provider);
        if (integration) await api.delete(`/integrations/${integration.id}`);
      } else {
        await api.post("/integrations", { provider, config_json: {} });
      }
      fetchIntegrations();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Platform Integrations</h1>
        <p className="text-gray-500">Connect SupportDesk with your existing tools and workflows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Link href="/admin/integrations/api-keys" className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition group cursor-pointer">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition">
            <Key className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">API Keys</h3>
          <p className="text-sm text-gray-500">Generate secure keys for programmatic REST API access.</p>
        </Link>
        
        <Link href="/admin/integrations/webhooks" className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition group cursor-pointer">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition">
            <Webhook className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Webhooks</h3>
          <p className="text-sm text-gray-500">Subscribe to real-time event notifications via HTTP callbacks.</p>
        </Link>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-md transition group cursor-pointer">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition">
            <Code className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Developer Portal</h3>
          <p className="text-sm text-gray-500">View OpenAPI specifications and integration guides.</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Integration Marketplace</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS.map((app) => {
          const isActive = activeIntegrations.includes(app.id);
          return (
            <div key={app.id} className="bg-white p-6 rounded-xl border border-gray-200 flex items-start gap-4">
              {app.icon}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900">{app.name}</h3>
                  {app.status === "coming_soon" ? (
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">Coming Soon</span>
                  ) : isActive ? (
                    <span className="text-xs font-medium px-2 py-1 bg-green-50 text-green-600 rounded-full border border-green-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-gray-500 mb-4">{app.description}</p>
                {app.status !== "coming_soon" && (
                  <button 
                    onClick={() => handleToggle(app.id, isActive)}
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition ${
                      isActive 
                      ? "bg-red-50 text-red-600 hover:bg-red-100" 
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    {isActive ? "Disconnect" : "Connect"}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
