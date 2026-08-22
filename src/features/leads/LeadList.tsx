import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import type { Lead, PaginatedResponse } from "@/types/crm";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/auth";
import { Sidebar } from "@/components/SideBar";

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
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-800">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#fafafa] p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Leads
            </h1>
            {hasRole([UserRole.OWNER]) && (
              <Link
                to="/leads/new"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-700"
              >
                Create Lead
              </Link>
            )}
          </header>

          {/* Filters Box */}
          <div className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <form onSubmit={handleSearchSubmit} className="md:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-600 text-center md:text-left">
                  Search Leads
                </label>
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </form>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-600 text-center md:text-left">
                  Status Filter
                </label>
                <select
                  value={status}
                  onChange={(e) => updateFilters({ status: e.target.value })}
                  className="block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-gray-500 font-medium">
                Loading leads...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500 font-medium">
                {error}
              </div>
            ) : leads.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-medium">
                No leads found.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {leads.map((lead) => (
                    <tr
                      key={lead._id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-semibold text-gray-900">
                        {lead.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm capitalize text-gray-600">
                        {lead.status.replace("_", " ")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                        <Link
                          to={`/leads/${lead._id}`}
                          className="font-semibold text-indigo-600 hover:text-indigo-900"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 p-4">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("page", String(page - 1));
                  setSearchParams(params);
                }}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-gray-600">
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
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
