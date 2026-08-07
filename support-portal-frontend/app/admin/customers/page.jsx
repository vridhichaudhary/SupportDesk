"use client";

import { useEffect, useState } from "react";
import { Users, Search, Plus, Filter, MoreVertical, Building } from "lucide-react";
import api from "@/utils/axiosInstance";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get("/customers");
      setCustomers(res.data?.data || []);
    } catch (e) {
      console.error(e);
      setError("Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Customers</h1>
          <p className="text-stone-500 text-sm mt-1">Manage and view all customer records.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm whitespace-nowrap">
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row gap-4 justify-between bg-stone-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customers..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all placeholder:text-stone-400"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 text-stone-700 font-medium text-sm rounded-lg hover:bg-stone-50 transition-colors shadow-sm">
              <Filter className="w-4 h-4 text-stone-400" />
              Filter
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-x-auto min-h-[300px] relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 mb-1">Error Loading Data</h3>
              <p className="text-sm text-stone-500 mb-4">{error}</p>
              <button
                onClick={fetchCustomers}
                className="px-4 py-2 bg-white border border-stone-200 text-stone-700 font-medium text-xs rounded-lg hover:bg-stone-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : customers.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <div className="w-12 h-12 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-stone-300" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 mb-1">No customers found</h3>
              <p className="text-sm text-stone-500 max-w-sm">
                Get started by adding a new customer manually or importing via CSV.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-stone-600">
              <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Customer Name</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Email</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Company</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-stone-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {customer.name?.charAt(0) || "U"}
                      </div>
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 text-stone-500">{customer.email}</td>
                    <td className="px-6 py-4">
                      {customer.company_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200">
                          <Building className="w-3 h-3 text-stone-400" />
                          {customer.company_name}
                        </span>
                      ) : (
                        <span className="text-stone-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-stone-400 hover:text-stone-700 opacity-0 group-hover:opacity-100 transition-all p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
