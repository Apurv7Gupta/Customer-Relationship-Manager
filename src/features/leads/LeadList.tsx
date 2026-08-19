import { UserRole } from "@/types/auth";
import { useAuth } from "@/context/AuthContext";
import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import type { Lead, PaginatedResponse } from "@/types/crm";

export const LeadList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse<Lead> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hasRole } = useAuth();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || ""; // Extract search state from URL

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass search parameter to the API request to implement functional search
      const response = await api.get<PaginatedResponse<Lead>>("/api/leads", {
        params: {
          page,
          page_size: 10,
          status: status || undefined,
          search: search || undefined,
        },
      });
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, status, search]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams({ page: "1", status: e.target.value, search });
  };

  // Handler for text search to update URL params
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({ page: "1", status, search: e.target.value });
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="px-3 py-1 text-sm font-medium text-white bg-blue-700 border border-gray-300 rounded shadow-sm hover:bg-blue-800"
          >
            &larr;
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        </div>
        {hasRole([UserRole.OWNER]) && (
          <Link
            to="/leads/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700"
          >
            Create Lead
          </Link>
        )}
      </div>

      <div className="mb-4 flex gap-4 bg-white p-4 rounded shadow items-end">
        {/* text search input */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">
            Search Leads
          </label>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={handleSearchChange}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
          />
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700">
            Status Filter
          </label>
          <select
            value={status}
            onChange={handleFilterChange}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="qualified">Qualified</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading leads...</div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded">{error}</div>
      ) : !data || data.data.length === 0 ? (
        <div className="bg-white text-center py-10 text-gray-500 rounded shadow">
          No leads found.
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Priority
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.data.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {lead.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {lead.status}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {lead.priority}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/leads/${lead._id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t">
            <button
              disabled={page <= 1}
              onClick={() =>
                setSearchParams({ page: (page - 1).toString(), status, search })
              }
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {data.meta.page} of {data.meta.total_pages}
            </span>
            <button
              disabled={page >= data.meta.total_pages}
              onClick={() =>
                setSearchParams({ page: (page + 1).toString(), status, search })
              }
              className="px-3 py-1 border rounded text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
