import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import type { Lead, PaginatedResponse } from "@/types/crm";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/auth";

export const LeadList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(searchParams.get("page")) || 1;
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const [searchInput, setSearchInput] = useState(search);
  const { hasRole } = useAuth();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        page_size: 10,
      };
      if (status) params.status = status;
      if (search) params.search = search;

      const res = await api.get<PaginatedResponse<Lead>>("/api/leads", {
        params,
      });
      setLeads(res.data.data);
      setTotal(res.data.meta.total);
      setTotalPages(res.data.meta.total_pages);
    } catch (err: any) {
      console.error("Failed to fetch leads", err);
      setError(err.response?.data?.detail || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateFilters = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="px-3 py-1 text-sm font-medium text-white bg-blue-700 rounded shadow-sm hover:bg-blue-800"
            >
              &larr;
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          </div>
          {hasRole([UserRole.OWNER]) && (
            <Link
              to="/leads/new"
              className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 text-sm font-medium"
            >
              Create Lead
            </Link>
          )}
        </div>

        {/* Filters Box */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <form onSubmit={handleSearchSubmit} className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 text-center md:text-left mb-2">
                Search Leads
              </label>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              />
            </form>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-center md:text-left mb-2">
                Status Filter
              </label>
              <select
                value={status}
                onChange={(e) => updateFilters({ status: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm bg-white"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="meeting_scheduled">Meeting Scheduled</option>
                <option value="proposal_sent">Proposal Sent</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lead Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading leads...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No leads found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {/* CHANGED: Removed Priority column header */}
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                      {lead.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize text-center">
                      {lead.status.replace("_", " ")}
                    </td>
                    {/* CHANGED: Priority column data cell removed */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <Link
                        to={`/leads/${lead._id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-gray-200 p-4">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set("page", String(page - 1));
                setSearchParams(params);
              }}
              className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages || 1} (Total: {total})
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set("page", String(page + 1));
                setSearchParams(params);
              }}
              className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
