import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import type { Lead, PaginatedResponse } from "@/types/crm";
import { useAuth } from "@/context/AuthContext";
import { LogoutIcon } from "@/components/ui/Icons";
import { Sidebar } from "@/components/SideBar";
import { motion } from "framer-motion";

export const LeadList: React.FC = () => {
  const { logout } = useAuth();
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-800">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#fafafa] p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                Leads
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={logout}
                className="hidden ml-auto sm:flex items-center gap-2 rounded-lg bg-red-600 px-3 py-[5px] text-sm text-white shadow-sm transition-colors hover:bg-red-700 sm:ml-2"
              >
                <LogoutIcon />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </motion.header>
          {/* <div className="bg-white rounded-2xl p-3 border border-gray-200"> */}
          <div className="">
            {/* Filters Box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 rounded-xl border border-gray-200 bg-white p-6"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <form onSubmit={handleSearchSubmit} className="md:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Search leads
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </form>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status Filter
                  </label>
                  <select
                    value={status}
                    onChange={(e) => updateFilters({ status: e.target.value })}
                    className="block w-full rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors capitalize"
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
            </motion.div>

            {/* Lead Table */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              {loading ? (
                <div className="p-12 text-center text-sm font-medium text-gray-500">
                  <span className="animate-pulse">Loading leads...</span>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-sm font-medium text-red-500">
                  {error}
                </div>
              ) : leads.length === 0 ? (
                <div className="p-12 text-center text-sm font-medium text-gray-500">
                  No leads found matching your criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Status
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <motion.tbody
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="divide-y divide-gray-50 bg-white"
                    >
                      {leads.map((lead) => (
                        <motion.tr
                          variants={itemVariants}
                          key={lead._id}
                          className="transition-colors hover:bg-gray-50/50"
                        >
                          <td className="whitespace-nowrap px-6 py-4 text-left text-sm font-semibold text-gray-900">
                            {lead.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-left text-sm">
                            <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                              {lead.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                            <Link
                              to={`/leads/${lead._id}`}
                              className="inline-flex items-center font-medium text-blue-400 transition-colors hover:text-blue-500"
                            >
                              View Details{" "}
                              <span className="ml-1 text-lg leading-none">
                                &rsaquo;
                              </span>
                            </Link>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
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
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-gray-500">
                  Page{" "}
                  <span className="font-semibold text-gray-900">{page}</span> of{" "}
                  {totalPages || 1}{" "}
                  <span className="hidden sm:inline">(Total: {total})</span>
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set("page", String(page + 1));
                    setSearchParams(params);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};
